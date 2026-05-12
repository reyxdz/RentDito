import { Bill, IBill } from '../models/Bill';
import { Payment } from '../models/Payment';
import { Tenancy } from '../models/Tenancy';
import { Contract } from '../models/Contract';
import { Property } from '../models/Property';
import { Unit } from '../models/Unit';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { generateReceiptHTML, ReceiptTemplateData } from './templates/receiptTemplate';
import puppeteer from 'puppeteer';
import cloudinary from '../config/cloudinary';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

const verifyManagementAccess = async (userId: string, propertyId: string) => {
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const property = await Property.findById(propertyId);
  if (!property) throw Object.assign(new Error('Property not found'), { statusCode: 404 });

  const isLandlord = property.landlordId.toString() === userId;
  const isStaff = user.role === 'staff' && user.assignedPropertyIds?.some(id => id.toString() === propertyId);
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }
  return { user, property };
};

/**
 * Compute billing period for a given month/year.
 */
const computeBillingPeriod = (year: number, month: number) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // last day of month
  return { start, end };
};

/**
 * Compute due date from property billing settings.
 */
const computeDueDate = (year: number, month: number, dueDay: number): Date => {
  const maxDay = new Date(year, month, 0).getDate();
  const day = Math.min(dueDay, maxDay);
  return new Date(year, month - 1, day);
};

type ReadingInput = {
  previousReading: number;
  currentReading: number;
  rate: number;
};

type UtilityBillInput = {
  tenancyId: string;
  billingPeriod: { start: string; end: string };
  dueDate: string;
  allocationMode?: 'full' | 'per_head';
  utilityBreakdown: {
    electricity?: ReadingInput;
    water?: ReadingInput;
    internet?: { amount: number };
    others?: { description?: string; amount: number };
  };
  notes?: string;
};

type CombinedBillInput = {
  tenancyId: string;
  billingPeriod: { start: string; end: string };
  dueDate: string;
  rentAmount: number;
  utilityBreakdown?: UtilityBillInput['utilityBreakdown'];
  allocationMode?: 'full' | 'per_head';
  penaltyAmount?: number;
  notes?: string;
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

const computeReadingCharge = (reading?: ReadingInput) => {
  if (!reading) return undefined;
  if (reading.currentReading < reading.previousReading) {
    throw Object.assign(new Error('Current reading cannot be lower than previous reading'), { statusCode: 400 });
  }

  const consumption = round2(reading.currentReading - reading.previousReading);
  const amount = round2(consumption * reading.rate);

  return {
    previousReading: reading.previousReading,
    currentReading: reading.currentReading,
    consumption,
    rate: reading.rate,
    amount
  };
};

const getUtilityComputation = async (tenancy: any, data: UtilityBillInput | CombinedBillInput) => {
  const allocationMode = data.allocationMode || 'full';
  const utilityBreakdownInput = (data as UtilityBillInput).utilityBreakdown || {};
  const electricity = computeReadingCharge(utilityBreakdownInput.electricity);
  const water = computeReadingCharge(utilityBreakdownInput.water);
  const internet = utilityBreakdownInput.internet ? { amount: round2(utilityBreakdownInput.internet.amount || 0) } : undefined;
  const others = utilityBreakdownInput.others
    ? {
        description: utilityBreakdownInput.others.description,
        amount: round2(utilityBreakdownInput.others.amount || 0)
      }
    : undefined;

  const totalUtility = round2(
    (electricity?.amount || 0) +
    (water?.amount || 0) +
    (internet?.amount || 0) +
    (others?.amount || 0)
  );

  let allocationNote: string | undefined;
  let billedUtilityAmount = totalUtility;

  if (allocationMode === 'per_head') {
    const occupants = await Tenancy.countDocuments({
      unitId: tenancy.unitId,
      status: 'checked_in'
    });
    if (occupants <= 0) {
      throw Object.assign(new Error('No checked-in occupants found for per-head allocation'), { statusCode: 400 });
    }
    billedUtilityAmount = round2(totalUtility / occupants);
    allocationNote = `Shared utility: total ₱${totalUtility.toLocaleString('en-PH', { minimumFractionDigits: 2 })} divided by ${occupants} occupant(s) = ₱${billedUtilityAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} per occupant`;
  }

  return {
    utilityAmount: billedUtilityAmount,
    utilityBreakdown: {
      ...(electricity ? { electricity } : {}),
      ...(water ? { water } : {}),
      ...(internet ? { internet } : {}),
      ...(others ? { others } : {})
    },
    allocationNote
  };
};

/**
 * Generate a receipt number: RD-YYYYMMDD-XXXXX
 */
const generateReceiptNumber = async (): Promise<string> => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await Payment.countDocuments();
  const seq = String(count + 1).padStart(5, '0');
  return `RD-${dateStr}-${seq}`;
};

// ─────────────────────────────────────────────────────────────
//  Auto-generate monthly bills
// ─────────────────────────────────────────────────────────────

export const autoGenerateMonthlyBills = async (
  userId: string,
  targetMonth?: number,
  targetYear?: number
) => {
  const now = new Date();
  const month = targetMonth || now.getMonth() + 1;
  const year = targetYear || now.getFullYear();

  // Find all active tenancies
  const tenancies: any[] = await Tenancy.find({ status: 'checked_in' })
    .populate('propertyId')
    .populate('unitId')
    .populate('contractId');

  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (const tenancy of tenancies) {
    try {
      const contract = tenancy.contractId;
      const property = tenancy.propertyId;
      const unit = tenancy.unitId;

      if (!contract || !property) {
        results.skipped++;
        continue;
      }

      const { start, end } = computeBillingPeriod(year, month);
      const dueDay = property.billingSettings?.dueDay || 5;
      const dueDate = computeDueDate(year, month, dueDay);

      // Check for existing bill
      const existing = await Bill.findOne({
        tenancyId: tenancy._id,
        type: 'rent',
        isAutoGenerated: true,
        'billingPeriod.start': start,
        'billingPeriod.end': end
      });

      if (existing) {
        results.skipped++;
        continue;
      }

      const rentAmount = contract.monthlyRent || 0;

      await Bill.create({
        tenancyId: tenancy._id,
        propertyId: property._id,
        unitId: unit._id,
        contractId: contract._id,
        type: 'rent',
        billingPeriod: { start, end },
        rentAmount,
        utilityAmount: 0,
        penaltyAmount: 0,
        totalAmount: rentAmount,
        paidAmount: 0,
        balanceAmount: rentAmount,
        status: 'unpaid',
        dueDate,
        isAutoGenerated: true
      });

      // Notify tenant
      await Notification.create({
        userId: tenancy.userId,
        type: 'billing',
        title: 'New Bill Generated',
        message: `Your rent bill for ${start.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })} has been generated. Amount: ₱${rentAmount.toLocaleString()}. Due: ${dueDate.toLocaleDateString('en-PH')}.`,
        link: '/u/my-bills',
        metadata: { tenancyId: tenancy._id.toString(), propertyId: property._id.toString() }
      });

      results.created++;
    } catch (err: any) {
      results.errors.push(`Tenancy ${tenancy._id}: ${err.message}`);
    }
  }

  return results;
};

// ─────────────────────────────────────────────────────────────
//  Create manual bill
// ─────────────────────────────────────────────────────────────

export const createManualBill = async (userId: string, data: {
  tenancyId: string;
  type: string;
  billingPeriod: { start: string; end: string };
  rentAmount?: number;
  utilityAmount?: number;
  penaltyAmount?: number;
  dueDate: string;
  utilityBreakdown?: any;
  notes?: string;
}) => {
  const tenancy: any = await Tenancy.findById(data.tenancyId).populate('propertyId');
  if (!tenancy) throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });

  await verifyManagementAccess(userId, tenancy.propertyId._id.toString());

  const rentAmount = data.rentAmount || 0;
  const utilityAmount = data.utilityAmount || 0;
  const penaltyAmount = data.penaltyAmount || 0;
  const totalAmount = rentAmount + utilityAmount + penaltyAmount;

  const bill = await Bill.create({
    tenancyId: tenancy._id,
    propertyId: tenancy.propertyId._id,
    unitId: tenancy.unitId,
    contractId: tenancy.contractId,
    type: data.type,
    billingPeriod: {
      start: new Date(data.billingPeriod.start),
      end: new Date(data.billingPeriod.end)
    },
    rentAmount,
    utilityAmount,
    penaltyAmount,
    totalAmount,
    paidAmount: 0,
    balanceAmount: totalAmount,
    status: 'unpaid',
    dueDate: new Date(data.dueDate),
    utilityBreakdown: data.utilityBreakdown,
    isAutoGenerated: false,
    notes: data.notes
  });

  // Notify tenant
  await Notification.create({
    userId: tenancy.userId,
    type: 'billing',
    title: 'New Bill',
    message: `A new ${data.type} bill has been created. Amount: ₱${totalAmount.toLocaleString()}.`,
    link: '/u/my-bills',
    metadata: { billId: bill._id.toString() }
  });

  return bill;
};

export const createUtilityBill = async (userId: string, data: UtilityBillInput) => {
  const tenancy: any = await Tenancy.findById(data.tenancyId).populate('propertyId');
  if (!tenancy) throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });

  await verifyManagementAccess(userId, tenancy.propertyId._id.toString());

  const computation = await getUtilityComputation(tenancy, data);
  const notes = [data.notes, computation.allocationNote].filter(Boolean).join('\n');

  const bill = await Bill.create({
    tenancyId: tenancy._id,
    propertyId: tenancy.propertyId._id,
    unitId: tenancy.unitId,
    contractId: tenancy.contractId,
    type: 'utility',
    billingPeriod: {
      start: new Date(data.billingPeriod.start),
      end: new Date(data.billingPeriod.end)
    },
    rentAmount: 0,
    utilityAmount: computation.utilityAmount,
    penaltyAmount: 0,
    totalAmount: computation.utilityAmount,
    paidAmount: 0,
    balanceAmount: computation.utilityAmount,
    status: 'unpaid',
    dueDate: new Date(data.dueDate),
    utilityBreakdown: computation.utilityBreakdown,
    isAutoGenerated: false,
    notes: notes || undefined
  });

  await Notification.create({
    userId: tenancy.userId,
    type: 'billing',
    title: 'Utility Bill Generated',
    message: `A new utility bill has been created. Amount: ₱${computation.utilityAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`,
    link: '/u/my-bills',
    metadata: { billId: bill._id.toString() }
  });

  return bill;
};

export const createCombinedBill = async (userId: string, data: CombinedBillInput) => {
  const tenancy: any = await Tenancy.findById(data.tenancyId).populate('propertyId');
  if (!tenancy) throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });

  await verifyManagementAccess(userId, tenancy.propertyId._id.toString());

  const utilityComputation = await getUtilityComputation(tenancy, {
    tenancyId: data.tenancyId,
    billingPeriod: data.billingPeriod,
    dueDate: data.dueDate,
    allocationMode: data.allocationMode,
    utilityBreakdown: data.utilityBreakdown || {},
    notes: data.notes
  });

  const penaltyAmount = round2(data.penaltyAmount || 0);
  const rentAmount = round2(data.rentAmount || 0);
  const totalAmount = round2(rentAmount + utilityComputation.utilityAmount + penaltyAmount);
  const notes = [data.notes, utilityComputation.allocationNote].filter(Boolean).join('\n');

  const bill = await Bill.create({
    tenancyId: tenancy._id,
    propertyId: tenancy.propertyId._id,
    unitId: tenancy.unitId,
    contractId: tenancy.contractId,
    type: 'combined',
    billingPeriod: {
      start: new Date(data.billingPeriod.start),
      end: new Date(data.billingPeriod.end)
    },
    rentAmount,
    utilityAmount: utilityComputation.utilityAmount,
    penaltyAmount,
    totalAmount,
    paidAmount: 0,
    balanceAmount: totalAmount,
    status: 'unpaid',
    dueDate: new Date(data.dueDate),
    utilityBreakdown: utilityComputation.utilityBreakdown,
    isAutoGenerated: false,
    notes: notes || undefined
  });

  await Notification.create({
    userId: tenancy.userId,
    type: 'billing',
    title: 'Combined Bill Generated',
    message: `A combined rent + utility bill has been created. Total: ₱${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`,
    link: '/u/my-bills',
    metadata: { billId: bill._id.toString() }
  });

  return bill;
};

// ─────────────────────────────────────────────────────────────
//  Record payment
// ─────────────────────────────────────────────────────────────

export const recordPayment = async (userId: string, billId: string, data: {
  amount: number;
  method: string;
  paymentDate?: string;
  referenceNumber?: string;
  proofImageUrl?: string;
  notes?: string;
}) => {
  const bill: any = await Bill.findById(billId).populate('tenancyId propertyId');
  if (!bill) throw Object.assign(new Error('Bill not found'), { statusCode: 404 });

  await verifyManagementAccess(userId, bill.propertyId._id.toString());

  if (bill.status === 'paid') {
    throw Object.assign(new Error('Bill is already fully paid'), { statusCode: 400 });
  }

  if (data.amount <= 0) {
    throw Object.assign(new Error('Payment amount must be greater than zero'), { statusCode: 400 });
  }

  if (data.amount > bill.balanceAmount) {
    throw Object.assign(new Error(`Payment amount (₱${data.amount}) exceeds balance (₱${bill.balanceAmount})`), { statusCode: 400 });
  }

  // Create payment record
  const payment = await Payment.create({
    billId: bill._id,
    tenancyId: bill.tenancyId._id || bill.tenancyId,
    amount: data.amount,
    paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
    method: data.method,
    referenceNumber: data.referenceNumber,
    proofImageUrl: data.proofImageUrl,
    recordedByUserId: userId,
    notes: data.notes
  });

  // Update bill amounts
  bill.paidAmount += data.amount;
  bill.balanceAmount = bill.totalAmount - bill.paidAmount;
  bill.status = bill.balanceAmount <= 0 ? 'paid' : 'partial';
  await bill.save();

  // Notify tenant
  const tenancy: any = await Tenancy.findById(bill.tenancyId._id || bill.tenancyId);
  if (tenancy) {
    await Notification.create({
      userId: tenancy.userId,
      type: 'billing',
      title: 'Payment Recorded',
      message: `A payment of ₱${data.amount.toLocaleString()} has been recorded. ${bill.status === 'paid' ? 'Your bill is now fully paid!' : `Remaining balance: ₱${bill.balanceAmount.toLocaleString()}`}`,
      link: '/u/my-bills',
      metadata: { billId: bill._id.toString(), paymentId: payment._id.toString() }
    });
  }

  return { payment, bill };
};

// ─────────────────────────────────────────────────────────────
//  Apply late fee
// ─────────────────────────────────────────────────────────────

export const applyLateFee = async (userId: string, billId: string) => {
  const bill: any = await Bill.findById(billId).populate('propertyId');
  if (!bill) throw Object.assign(new Error('Bill not found'), { statusCode: 404 });

  await verifyManagementAccess(userId, bill.propertyId._id.toString());

  if (bill.status === 'paid') {
    throw Object.assign(new Error('Cannot apply late fee to a fully paid bill'), { statusCode: 400 });
  }

  const now = new Date();
  if (now <= bill.dueDate) {
    throw Object.assign(new Error('Bill is not yet past due'), { statusCode: 400 });
  }

  const property = bill.propertyId;
  const lateFeePercent = property.billingSettings?.lateFeePercent || 5;
  const penaltyAmount = Math.round((bill.rentAmount + bill.utilityAmount) * (lateFeePercent / 100) * 100) / 100;

  bill.penaltyAmount += penaltyAmount;
  bill.totalAmount = bill.rentAmount + bill.utilityAmount + bill.penaltyAmount;
  bill.balanceAmount = bill.totalAmount - bill.paidAmount;
  bill.status = 'overdue';
  await bill.save();

  // Notify tenant
  const tenancy: any = await Tenancy.findById(bill.tenancyId);
  if (tenancy) {
    await Notification.create({
      userId: tenancy.userId,
      type: 'billing',
      title: 'Late Fee Applied',
      message: `A late fee of ₱${penaltyAmount.toLocaleString()} (${lateFeePercent}%) has been applied to your overdue bill. New total: ₱${bill.totalAmount.toLocaleString()}.`,
      link: '/u/my-bills',
      metadata: { billId: bill._id.toString() }
    });
  }

  return bill;
};

// ─────────────────────────────────────────────────────────────
//  Update bill
// ─────────────────────────────────────────────────────────────

export const updateBill = async (userId: string, billId: string, updates: {
  rentAmount?: number;
  utilityAmount?: number;
  penaltyAmount?: number;
  dueDate?: string;
  utilityBreakdown?: any;
  notes?: string;
}) => {
  const bill: any = await Bill.findById(billId).populate('propertyId');
  if (!bill) throw Object.assign(new Error('Bill not found'), { statusCode: 404 });

  await verifyManagementAccess(userId, bill.propertyId._id.toString());

  if (bill.status === 'paid') {
    throw Object.assign(new Error('Cannot update a fully paid bill'), { statusCode: 400 });
  }

  if (updates.rentAmount !== undefined) bill.rentAmount = updates.rentAmount;
  if (updates.utilityAmount !== undefined) bill.utilityAmount = updates.utilityAmount;
  if (updates.penaltyAmount !== undefined) bill.penaltyAmount = updates.penaltyAmount;
  if (updates.dueDate) bill.dueDate = new Date(updates.dueDate);
  if (updates.utilityBreakdown) bill.utilityBreakdown = updates.utilityBreakdown;
  if (updates.notes !== undefined) bill.notes = updates.notes;

  bill.totalAmount = bill.rentAmount + bill.utilityAmount + bill.penaltyAmount;
  bill.balanceAmount = bill.totalAmount - bill.paidAmount;

  if (bill.balanceAmount <= 0) bill.status = 'paid';
  else if (bill.paidAmount > 0) bill.status = 'partial';
  else bill.status = 'unpaid';

  await bill.save();
  return bill;
};

// ─────────────────────────────────────────────────────────────
//  Generate receipt PDF
// ─────────────────────────────────────────────────────────────

export const generateReceipt = async (userId: string, billId: string) => {
  const bill: any = await Bill.findById(billId)
    .populate({ path: 'tenancyId', populate: { path: 'userId', select: 'name phone' } })
    .populate('propertyId')
    .populate('unitId');

  if (!bill) throw Object.assign(new Error('Bill not found'), { statusCode: 404 });

  await verifyManagementAccess(userId, bill.propertyId._id.toString());

  // Get the latest payment for this bill
  const latestPayment: any = await Payment.findOne({ billId })
    .sort({ createdAt: -1 })
    .populate('recordedByUserId', 'name');

  if (!latestPayment) {
    throw Object.assign(new Error('No payments recorded for this bill yet'), { statusCode: 400 });
  }

  const receiptNumber = await generateReceiptNumber();
  const tenancy = bill.tenancyId;
  const tenant = tenancy.userId;
  const property = bill.propertyId;
  const unit = bill.unitId;

  const propertyAddress = [
    property.address?.street, property.address?.barangay,
    property.address?.city, property.address?.province, property.address?.zipCode
  ].filter(Boolean).join(', ');

  const periodStart = bill.billingPeriod.start.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  const periodEnd = bill.billingPeriod.end.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  const billingPeriod = periodStart === periodEnd ? periodStart : `${periodStart} — ${periodEnd}`;

  const templateData: ReceiptTemplateData = {
    receiptNumber,
    paymentDate: latestPayment.paymentDate.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
    tenantName: tenant.name,
    tenantPhone: tenant.phone || '',
    propertyName: property.name,
    propertyAddress,
    unitIdentifier: unit.unitIdentifier,
    landlordName: (await User.findById(property.landlordId))?.name || 'Landlord',
    billType: bill.type,
    billingPeriod,
    rentAmount: bill.rentAmount,
    utilityAmount: bill.utilityAmount,
    penaltyAmount: bill.penaltyAmount,
    totalAmount: bill.totalAmount,
    paidAmount: bill.paidAmount,
    balanceAmount: bill.balanceAmount,
    paymentAmount: latestPayment.amount,
    paymentMethod: latestPayment.method,
    referenceNumber: latestPayment.referenceNumber,
    recordedBy: latestPayment.recordedByUserId?.name || 'System',
    notes: latestPayment.notes,
    utilityBreakdown: bill.utilityBreakdown || undefined
  };

  const html = generateReceiptHTML(templateData);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const tempDir = os.tmpdir();
  const pdfPath = path.join(tempDir, `receipt-${bill._id}-${Date.now()}.pdf`);

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
  });

  await browser.close();

  const uploadResult = await cloudinary.uploader.upload(pdfPath, {
    folder: 'rentdito/receipts',
    resource_type: 'raw',
    public_id: `receipt-${bill._id}-${Date.now()}`,
    overwrite: true
  });

  fs.unlinkSync(pdfPath);

  bill.receiptUrl = uploadResult.secure_url;
  await bill.save();

  return { receiptUrl: uploadResult.secure_url, bill };
};

// ─────────────────────────────────────────────────────────────
//  Read operations
// ─────────────────────────────────────────────────────────────

export const getBills = async (userId: string, filters: {
  status?: string; propertyId?: string; tenancyId?: string; type?: string;
} = {}) => {
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  let propertyFilter: any = {};

  if (user.role === 'landlord') {
    const properties = await Property.find({ landlordId: userId }).select('_id');
    propertyFilter = { propertyId: { $in: properties.map(p => p._id) } };
  } else if (user.role === 'staff') {
    if (!user.assignedPropertyIds || user.assignedPropertyIds.length === 0) return [];
    propertyFilter = { propertyId: { $in: user.assignedPropertyIds } };
  } else if (user.role === 'user') {
    // Users can only see their own bills via tenancy
    const tenancies = await Tenancy.find({ userId }).select('_id');
    propertyFilter = { tenancyId: { $in: tenancies.map(t => t._id) } };
  } else if (user.role !== 'super_admin') {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  const query: any = { ...propertyFilter };
  if (filters.status) query.status = filters.status;
  if (filters.propertyId) query.propertyId = filters.propertyId;
  if (filters.tenancyId) query.tenancyId = filters.tenancyId;
  if (filters.type) query.type = filters.type;

  return Bill.find(query)
    .populate({ path: 'tenancyId', populate: { path: 'userId', select: 'name email avatar' } })
    .populate('propertyId', 'name address')
    .populate('unitId', 'unitIdentifier accommodationType')
    .populate('contractId', 'monthlyRent startDate endDate')
    .sort({ createdAt: -1 })
    .lean();
};

export const getBillsByTenancy = async (userId: string, tenancyId: string) => {
  const tenancy: any = await Tenancy.findById(tenancyId).populate('propertyId');
  if (!tenancy) throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });

  // Access check: owner, landlord, staff, or admin
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const isOwner = tenancy.userId.toString() === userId;
  const isLandlord = tenancy.propertyId.landlordId.toString() === userId;
  const isStaff = user.role === 'staff' && user.assignedPropertyIds?.some(
    (id: any) => id.toString() === tenancy.propertyId._id.toString()
  );
  const isAdmin = user.role === 'super_admin';

  if (!isOwner && !isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  return Bill.find({ tenancyId })
    .populate('propertyId', 'name address')
    .populate('unitId', 'unitIdentifier')
    .sort({ createdAt: -1 })
    .lean();
};

export const getBillById = async (userId: string, billId: string) => {
  const bill: any = await Bill.findById(billId)
    .populate({ path: 'tenancyId', populate: { path: 'userId', select: 'name email phone avatar' } })
    .populate('propertyId', 'name address landlordId billingSettings')
    .populate('unitId', 'unitIdentifier accommodationType')
    .populate('contractId', 'monthlyRent startDate endDate lockInPeriod')
    .lean();

  if (!bill) throw Object.assign(new Error('Bill not found'), { statusCode: 404 });

  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const isOwner = bill.tenancyId?.userId?._id?.toString() === userId;
  const isLandlord = bill.propertyId?.landlordId?.toString() === userId;
  const isStaff = user.role === 'staff' && user.assignedPropertyIds?.some(
    (id: any) => id.toString() === bill.propertyId?._id?.toString()
  );
  const isAdmin = user.role === 'super_admin';

  if (!isOwner && !isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  // Include payments
  const payments = await Payment.find({ billId })
    .populate('recordedByUserId', 'name')
    .sort({ createdAt: -1 })
    .lean();

  return { ...bill, payments };
};

// ─────────────────────────────────────────────────────────────
//  Payment read operations
// ─────────────────────────────────────────────────────────────

export const getPayments = async (userId: string, filters: {
  tenancyId?: string; method?: string;
} = {}) => {
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  let baseFilter: any = {};

  if (user.role === 'landlord') {
    const properties = await Property.find({ landlordId: userId }).select('_id');
    const bills = await Bill.find({ propertyId: { $in: properties.map(p => p._id) } }).select('_id');
    baseFilter = { billId: { $in: bills.map(b => b._id) } };
  } else if (user.role === 'staff') {
    if (!user.assignedPropertyIds?.length) return [];
    const bills = await Bill.find({ propertyId: { $in: user.assignedPropertyIds } }).select('_id');
    baseFilter = { billId: { $in: bills.map(b => b._id) } };
  } else if (user.role === 'user') {
    const tenancies = await Tenancy.find({ userId }).select('_id');
    baseFilter = { tenancyId: { $in: tenancies.map(t => t._id) } };
  } else if (user.role !== 'super_admin') {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  const query: any = { ...baseFilter };
  if (filters.tenancyId) query.tenancyId = filters.tenancyId;
  if (filters.method) query.method = filters.method;

  return Payment.find(query)
    .populate({ path: 'billId', select: 'type billingPeriod totalAmount status' })
    .populate('recordedByUserId', 'name')
    .sort({ paymentDate: -1 })
    .lean();
};

export const getPaymentsByTenancy = async (userId: string, tenancyId: string) => {
  const tenancy: any = await Tenancy.findById(tenancyId).populate('propertyId');
  if (!tenancy) throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });

  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const isOwner = tenancy.userId.toString() === userId;
  const isLandlord = tenancy.propertyId.landlordId.toString() === userId;
  const isStaff = user.role === 'staff' && user.assignedPropertyIds?.some(
    (id: any) => id.toString() === tenancy.propertyId._id.toString()
  );
  const isAdmin = user.role === 'super_admin';

  if (!isOwner && !isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  return Payment.find({ tenancyId })
    .populate({ path: 'billId', select: 'type billingPeriod totalAmount status dueDate' })
    .populate('recordedByUserId', 'name')
    .sort({ paymentDate: -1 })
    .lean();
};

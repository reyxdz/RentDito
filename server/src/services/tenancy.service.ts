import { Tenancy, ITenancy } from '../models/Tenancy';
import { Contract } from '../models/Contract';
import { Unit } from '../models/Unit';
import { Property } from '../models/Property';
import { User } from '../models/User';
import { RentalApplication } from '../models/RentalApplication';
import { Notification } from '../models/Notification';
import { Bill } from '../models/Bill';
import { InventoryRecord } from '../models/InventoryRecord';

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Verify the caller is a landlord/staff with property access, or super_admin.
 * Returns the resolved user document.
 */
const verifyManagementAccess = async (
  userId: string,
  propertyId: string
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = await Property.findById(propertyId);
  if (!property) {
    throw Object.assign(new Error('Property not found'), { statusCode: 404 });
  }

  const isLandlord = property.landlordId.toString() === userId;
  const isStaff =
    user.role === 'staff' &&
    user.assignedPropertyIds?.some(id => id.toString() === propertyId);
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  return { user, property };
};

// ─────────────────────────────────────────────────────────────
//  confirmCheckin — The core check-in orchestration
// ─────────────────────────────────────────────────────────────

/**
 * Confirm tenant check-in from a signed contract.
 *
 * Cascading operations:
 *   1. Validate contract is signed
 *   2. Validate unit/slot availability
 *   3. Create Tenancy (status = checked_in)
 *   4. Update Contract (status → active, link tenancyId)
 *   5. Update Unit occupancy (room → occupied, bedspace → slot occupied)
 *   6. Create notifications for landlord + tenant
 */
export const confirmCheckin = async (
  userId: string,
  contractId: string,
  slotNumber?: number
) => {
  // 1. Load and validate the contract
  const contract: any = await Contract.findById(contractId)
    .populate('propertyId')
    .populate('unitId')
    .populate('userId');

  if (!contract) {
    throw Object.assign(new Error('Contract not found'), { statusCode: 404 });
  }

  if (contract.status !== 'signed') {
    throw Object.assign(
      new Error(`Contract must be in 'signed' status to check in. Current status: ${contract.status}`),
      { statusCode: 400 }
    );
  }

  // Check if a tenancy already exists for this contract
  const existingTenancy = await Tenancy.findOne({ contractId });
  if (existingTenancy) {
    throw Object.assign(
      new Error('A tenancy already exists for this contract'),
      { statusCode: 409 }
    );
  }

  const property = contract.propertyId;
  const unit = contract.unitId;
  const tenant = contract.userId;

  // 2. Verify caller has management access to this property
  await verifyManagementAccess(userId, property._id.toString());

  // 3. Load the current unit state (fresh, not from populated contract)
  const currentUnit = await Unit.findById(unit._id);
  if (!currentUnit) {
    throw Object.assign(new Error('Unit not found'), { statusCode: 404 });
  }

  // 4. Validate unit/slot availability based on accommodation type
  if (currentUnit.accommodationType === 'bedspace') {
    // Bedspace mode: slotNumber is required
    if (!slotNumber) {
      throw Object.assign(
        new Error('slotNumber is required for bedspace units'),
        { statusCode: 400 }
      );
    }

    if (!currentUnit.slots || currentUnit.slots.length === 0) {
      throw Object.assign(
        new Error('Unit has no slots configured'),
        { statusCode: 400 }
      );
    }

    const targetSlot = currentUnit.slots.find(s => s.slotNumber === slotNumber);
    if (!targetSlot) {
      throw Object.assign(
        new Error(`Slot ${slotNumber} does not exist on this unit`),
        { statusCode: 400 }
      );
    }

    if (targetSlot.status !== 'vacant') {
      throw Object.assign(
        new Error(`Slot ${slotNumber} is already ${targetSlot.status}`),
        { statusCode: 400 }
      );
    }
  } else {
    // Room mode: entire unit must be vacant
    if (currentUnit.status !== 'vacant') {
      throw Object.assign(
        new Error(`Unit is currently ${currentUnit.status} and cannot accept check-in`),
        { statusCode: 400 }
      );
    }
  }

  // 5. Get personal details from the related rental application
  const application = await RentalApplication.findById(contract.applicationId);
  if (!application) {
    throw Object.assign(
      new Error('Related rental application not found'),
      { statusCode: 404 }
    );
  }

  // 6. Create the Tenancy record
  const tenancy = await Tenancy.create({
    userId: tenant._id,
    propertyId: property._id,
    unitId: currentUnit._id,
    contractId: contract._id,
    status: 'checked_in',
    checkInDate: new Date(),
    slotNumber: currentUnit.accommodationType === 'bedspace' ? slotNumber : undefined,
    isPrimary: currentUnit.accommodationType === 'room',
    personalDetails: {
      fullName: application.personalDetails.fullName,
      phone: application.personalDetails.phone,
      occupation: application.personalDetails.occupation,
      school: application.personalDetails.school,
      address: application.personalDetails.address,
      emergencyContact: {
        name: application.personalDetails.emergencyContact.name,
        phone: application.personalDetails.emergencyContact.phone,
        relationship: application.personalDetails.emergencyContact.relationship
      }
    }
  });

  // 7. Update Contract → active + link tenancyId
  contract.status = 'active';
  contract.tenancyId = tenancy._id;
  await contract.save();

  // 8. Update Unit occupancy
  if (currentUnit.accommodationType === 'bedspace') {
    // Mark the specific slot as occupied
    const slotIndex = currentUnit.slots!.findIndex(s => s.slotNumber === slotNumber);
    currentUnit.slots![slotIndex].status = 'occupied';
    currentUnit.slots![slotIndex].tenancyId = tenancy._id as any;

    // If ALL slots are now occupied, mark the entire unit as occupied
    const allOccupied = currentUnit.slots!.every(s => s.status === 'occupied');
    if (allOccupied) {
      currentUnit.status = 'occupied';
    }
  } else {
    // Room mode: mark entire unit as occupied
    currentUnit.status = 'occupied';
  }

  await currentUnit.save(); // This triggers the Unit post-save hook to update Property metrics

  // 9. Create notifications
  await Notification.create({
    userId: tenant._id,
    type: 'tenancy',
    title: 'Check-In Confirmed',
    message: `Welcome! Your check-in at ${unit.unitIdentifier} in ${property.name} has been confirmed. You are now an active tenant.`,
    link: `/u/my-room`,
    metadata: {
      tenancyId: tenancy._id.toString(),
      propertyId: property._id.toString(),
      unitId: currentUnit._id.toString()
    }
  });

  await Notification.create({
    userId: property.landlordId,
    type: 'tenancy',
    title: 'Tenant Checked In',
    message: `${tenant.name} has checked in to ${unit.unitIdentifier} at ${property.name}`,
    link: `/hub/tenants/${tenancy._id}`,
    metadata: {
      tenancyId: tenancy._id.toString(),
      propertyId: property._id.toString(),
      unitId: currentUnit._id.toString()
    }
  });

  // 10. Return the populated tenancy
  return tenancy.populate([
    { path: 'userId', select: 'name email phone avatar' },
    { path: 'propertyId', select: 'name address images' },
    { path: 'unitId', select: 'unitIdentifier accommodationType slots status' },
    { path: 'contractId', select: 'status startDate endDate monthlyRent' }
  ]);
};

// ─────────────────────────────────────────────────────────────
//  initiateCheckout — Close tenancy and release occupancy
// ─────────────────────────────────────────────────────────────

/**
 * Initiate tenant checkout.
 *
 * Cascading operations:
 *   1. Set tenancy status → checked_out, set checkOutDate
 *   2. Release unit/slot occupancy
 *   3. Expire/close contract
 *   4. Notify all parties
 */
const buildCheckoutReview = async (tenancy: any) => {
  const outstandingBills = await Bill.find({
    tenancyId: tenancy._id,
    balanceAmount: { $gt: 0 },
    status: { $in: ['unpaid', 'partial', 'overdue'] }
  })
    .select('type dueDate totalAmount paidAmount balanceAmount status billingPeriod')
    .sort({ dueDate: 1 })
    .lean();

  const unreturnedInventory = await InventoryRecord.find({
    tenancyId: tenancy._id,
    status: 'active'
  })
    .populate('inventoryItemId', 'itemName serialNumber')
    .select('inventoryItemId issuedDate quantityIssued status')
    .sort({ issuedDate: 1 })
    .lean();

  const contract: any = await Contract.findById(tenancy.contractId).select('status');
  const contractStatus = contract?.status || 'unknown';

  const warnings: string[] = [];
  if (outstandingBills.length > 0) warnings.push(`Outstanding bills found: ${outstandingBills.length}`);
  if (unreturnedInventory.length > 0) warnings.push(`Unreturned inventory found: ${unreturnedInventory.length}`);
  if (contractStatus !== 'active' && contractStatus !== 'signed') {
    warnings.push(`Contract status is '${contractStatus}'.`);
  }

  return {
    outstandingBills,
    unreturnedInventory,
    contractStatus,
    warnings
  };
};

export const getCheckoutReview = async (userId: string, tenancyId: string) => {
  const tenancy: any = await Tenancy.findById(tenancyId).populate('propertyId contractId');
  if (!tenancy) {
    throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });
  }

  await verifyManagementAccess(userId, tenancy.propertyId._id.toString());
  return buildCheckoutReview(tenancy);
};

export const processCheckout = async (userId: string, tenancyId: string) => {
  const tenancy: any = await Tenancy.findById(tenancyId)
    .populate('propertyId')
    .populate('unitId')
    .populate('userId')
    .populate('contractId');

  if (!tenancy) {
    throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });
  }

  if (tenancy.status !== 'checked_in') {
    throw Object.assign(
      new Error(`Cannot checkout tenancy with status '${tenancy.status}'. Must be 'checked_in'.`),
      { statusCode: 400 }
    );
  }

  const property = tenancy.propertyId;
  await verifyManagementAccess(userId, property._id.toString());

  const review = await buildCheckoutReview(tenancy);
  if (review.warnings.length > 0) {
    const error: any = Object.assign(new Error('Checkout blocked due to unresolved items.'), { statusCode: 400 });
    error.details = review;
    throw error;
  }

  const currentUnit: any = await Unit.findById(tenancy.unitId._id);
  if (currentUnit) {
    if (currentUnit.accommodationType === 'bedspace' && tenancy.slotNumber) {
      const slotIndex = currentUnit.slots?.findIndex((s: any) => s.slotNumber === tenancy.slotNumber);
      if (slotIndex !== undefined && slotIndex >= 0 && currentUnit.slots) {
        currentUnit.slots[slotIndex].status = 'vacant';
        currentUnit.slots[slotIndex].tenancyId = undefined;
      }

      const hasOccupiedSlots = currentUnit.slots?.some((s: any) => s.status === 'occupied');
      currentUnit.status = hasOccupiedSlots ? 'occupied' : 'vacant';
    } else {
      currentUnit.status = 'vacant';
    }

    await currentUnit.save();
  }

  const contract: any = await Contract.findById(tenancy.contractId._id);
  if (contract && (contract.status === 'active' || contract.status === 'signed')) {
    const now = new Date();
    contract.status = now <= new Date(contract.endDate) ? 'terminated' : 'expired';
    await contract.save();
  }

  tenancy.status = 'checked_out';
  tenancy.checkOutDate = new Date();
  await tenancy.save();

  const allBills = await Bill.find({ tenancyId: tenancy._id }).select('totalAmount paidAmount balanceAmount status').lean();
  const finalBillingSummary = allBills.reduce(
    (acc: any, bill: any) => {
      acc.totalBilled += bill.totalAmount || 0;
      acc.totalPaid += bill.paidAmount || 0;
      acc.remainingBalance += bill.balanceAmount || 0;
      if (bill.status === 'paid') acc.paidCount += 1;
      if (bill.status === 'unpaid' || bill.status === 'partial' || bill.status === 'overdue') acc.openCount += 1;
      return acc;
    },
    { totalBilled: 0, totalPaid: 0, remainingBalance: 0, paidCount: 0, openCount: 0, billCount: allBills.length }
  );

  finalBillingSummary.totalBilled = Math.round(finalBillingSummary.totalBilled * 100) / 100;
  finalBillingSummary.totalPaid = Math.round(finalBillingSummary.totalPaid * 100) / 100;
  finalBillingSummary.remainingBalance = Math.round(finalBillingSummary.remainingBalance * 100) / 100;

  const tenant = tenancy.userId;
  const unit = tenancy.unitId;

  await Notification.create({
    userId: tenant._id,
    type: 'tenancy',
    title: 'Checkout Complete',
    message: `Your tenancy at ${unit.unitIdentifier} in ${property.name} has been closed.`,
    link: `/u/dashboard`,
    metadata: {
      tenancyId: tenancy._id.toString(),
      propertyId: property._id.toString(),
      finalBillingSummary
    }
  });

  await Notification.create({
    userId: property.landlordId,
    type: 'tenancy',
    title: 'Tenant Checked Out',
    message: `${tenant.name} has checked out from ${unit.unitIdentifier} at ${property.name}.`,
    link: `/hub/tenants/${tenancy._id}`,
    metadata: {
      tenancyId: tenancy._id.toString(),
      propertyId: property._id.toString(),
      unitId: unit._id.toString(),
      finalBillingSummary
    }
  });

  return {
    tenancy: await Tenancy.findById(tenancy._id)
      .populate('userId', 'name email phone avatar')
      .populate('propertyId', 'name address images')
      .populate('unitId', 'unitIdentifier accommodationType slots status')
      .populate('contractId', 'status startDate endDate monthlyRent')
      .lean(),
    finalBillingSummary
  };
};

export const initiateCheckout = async (userId: string, tenancyId: string) => {
  return processCheckout(userId, tenancyId);
};

//  Read operations
// ─────────────────────────────────────────────────────────────

/**
 * Get the current user's tenancies.
 */
export const getMyTenancies = async (userId: string) => {
  const tenancies = await Tenancy.find({ userId })
    .populate('propertyId', 'name address images')
    .populate('unitId', 'unitIdentifier accommodationType roomRent bedspaceRent')
    .populate('contractId', 'status startDate endDate monthlyRent lockInPeriod')
    .sort({ createdAt: -1 })
    .lean();

  return tenancies;
};

/**
 * Get tenancies for landlord/staff (scoped by property access).
 */
export const getTenancies = async (
  userId: string,
  filters: { status?: string; propertyId?: string } = {}
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  // Build property filter based on role
  let propertyFilter: any = {};

  if (user.role === 'landlord') {
    const properties = await Property.find({ landlordId: userId }).select('_id');
    propertyFilter = { propertyId: { $in: properties.map(p => p._id) } };
  } else if (user.role === 'staff') {
    if (!user.assignedPropertyIds || user.assignedPropertyIds.length === 0) {
      return []; // Staff with no assigned properties sees nothing
    }
    propertyFilter = { propertyId: { $in: user.assignedPropertyIds } };
  } else if (user.role !== 'super_admin') {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  // Apply additional filters
  const query: any = { ...propertyFilter };
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.propertyId) {
    // Verify access to this specific property
    if (user.role === 'landlord') {
      const property = await Property.findOne({ _id: filters.propertyId, landlordId: userId });
      if (!property) {
        throw Object.assign(new Error('Access denied to this property'), { statusCode: 403 });
      }
    } else if (user.role === 'staff') {
      if (!user.assignedPropertyIds?.some(id => id.toString() === filters.propertyId)) {
        throw Object.assign(new Error('Access denied to this property'), { statusCode: 403 });
      }
    }
    query.propertyId = filters.propertyId;
  }

  const tenancies = await Tenancy.find(query)
    .populate('userId', 'name email phone avatar')
    .populate('propertyId', 'name address')
    .populate('unitId', 'unitIdentifier accommodationType')
    .populate('contractId', 'status startDate endDate monthlyRent')
    .sort({ createdAt: -1 })
    .lean();

  return tenancies;
};

/**
 * Get tenancy by ID (with access check).
 */
export const getTenancyById = async (userId: string, tenancyId: string) => {
  const tenancy: any = await Tenancy.findById(tenancyId)
    .populate('userId', 'name email phone avatar verificationStatus')
    .populate('propertyId', 'name address landlordId images')
    .populate('unitId', 'unitIdentifier accommodationType roomRent bedspaceRent deposit features images slots status')
    .populate('contractId', 'status startDate endDate monthlyRent lockInPeriod securityDeposit advancePayment signedAt documentUrl')
    .lean();

  if (!tenancy) {
    throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });
  }

  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  // Check access
  const isOwner = tenancy.userId._id.toString() === userId;
  const isLandlord = tenancy.propertyId.landlordId.toString() === userId;
  const isStaff =
    user.role === 'staff' &&
    user.assignedPropertyIds?.some(
      (id: any) => id.toString() === tenancy.propertyId._id.toString()
    );
  const isAdmin = user.role === 'super_admin';

  if (!isOwner && !isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  return tenancy;
};



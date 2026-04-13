import { Contract, IContract } from '../models/Contract';
import { RentalApplication } from '../models/RentalApplication';
import { User } from '../models/User';
import { Property } from '../models/Property';
import { Unit } from '../models/Unit';
import { Notification } from '../models/Notification';
import { generateContractHTML, ContractTemplateData } from './templates/contractTemplate';
import puppeteer from 'puppeteer';
import cloudinary from '../config/cloudinary';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Create contract from approved application
 */
export const createFromApplication = async (userId: string, applicationId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const application: any = await RentalApplication.findById(applicationId)
    .populate('userId')
    .populate('propertyId')
    .populate('unitId');

  if (!application) {
    throw Object.assign(new Error('Application not found'), { statusCode: 404 });
  }

  if (application.status !== 'approved') {
    throw Object.assign(
      new Error('Only approved applications can be converted to contracts'),
      { statusCode: 400 }
    );
  }

  const property = application.propertyId;
  const unit = application.unitId;
  const tenant = application.userId;

  // Check access
  const isLandlord = property.landlordId.toString() === userId;
  const isStaff =
    user.role === 'staff' &&
    user.assignedPropertyIds?.some(id => id.toString() === property._id.toString());
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  // Check if contract already exists for this application
  const existingContract = await Contract.findOne({ applicationId });
  if (existingContract) {
    throw Object.assign(
      new Error('Contract already exists for this application'),
      { statusCode: 409 }
    );
  }

  // Auto-populate contract data
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 7); // Start 7 days from now
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1); // 1 year lease

  const monthlyRent = unit.accommodationType === 'room' ? unit.roomRent : unit.bedspaceRent;
  const securityDeposit = unit.deposit;
  const advancePayment = monthlyRent; // 1 month advance

  const contract = await Contract.create({
    applicationId,
    propertyId: property._id,
    unitId: unit._id,
    landlordId: property.landlordId,
    userId: tenant._id,
    startDate,
    endDate,
    lockInPeriod: 6, // Default 6 months
    monthlyRent,
    securityDeposit,
    advancePayment,
    utilityIncludedInRent: false,
    rateType: 'fixed',
    status: 'draft'
  });

  // Notify tenant
  await Notification.create({
    userId: tenant._id,
    type: 'contract',
    title: 'Contract Draft Created',
    message: `A lease contract has been prepared for ${unit.unitIdentifier} at ${property.name}`,
    link: `/u/contracts/${contract._id}`,
    metadata: {
      contractId: contract._id.toString(),
      propertyId: property._id.toString(),
      unitId: unit._id.toString()
    }
  });

  return contract.populate(['applicationId', 'propertyId', 'unitId', 'landlordId', 'userId']);
};

/**
 * Get user's contracts
 */
export const getMyContracts = async (userId: string) => {
  const contracts = await Contract.find({ userId })
    .populate('propertyId', 'name address images')
    .populate('unitId', 'unitIdentifier accommodationType')
    .populate('landlordId', 'name email phone')
    .sort({ createdAt: -1 })
    .lean();

  return contracts;
};

/**
 * Get contracts for landlord
 */
export const getContracts = async (
  userId: string,
  filters: { status?: string; propertyId?: string } = {}
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  let propertyFilter: any = {};

  if (user.role === 'landlord') {
    const properties = await Property.find({ landlordId: userId }).select('_id');
    propertyFilter = { propertyId: { $in: properties.map(p => p._id) } };
  } else if (user.role === 'staff') {
    if (!user.assignedPropertyIds || user.assignedPropertyIds.length === 0) {
      return [];
    }
    propertyFilter = { propertyId: { $in: user.assignedPropertyIds } };
  } else if (user.role !== 'super_admin') {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  const query: any = { ...propertyFilter };
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.propertyId) {
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

  const contracts = await Contract.find(query)
    .populate('userId', 'name email phone avatar')
    .populate('propertyId', 'name address')
    .populate('unitId', 'unitIdentifier accommodationType')
    .sort({ createdAt: -1 })
    .lean();

  return contracts;
};

/**
 * Get contract by ID
 */
export const getContractById = async (userId: string, contractId: string) => {
  const contract: any = await Contract.findById(contractId)
    .populate('userId', 'name email phone avatar')
    .populate('propertyId', 'name address landlordId')
    .populate('unitId', 'unitIdentifier accommodationType roomRent bedspaceRent deposit')
    .populate('landlordId', 'name email phone')
    .populate('applicationId')
    .lean();

  if (!contract) {
    throw Object.assign(new Error('Contract not found'), { statusCode: 404 });
  }

  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const isOwner = contract.userId._id.toString() === userId;
  const isLandlord = contract.landlordId._id.toString() === userId;
  const isStaff =
    user.role === 'staff' &&
    user.assignedPropertyIds?.some(id => id.toString() === contract.propertyId._id.toString());
  const isAdmin = user.role === 'super_admin';

  if (!isOwner && !isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  return contract;
};

/**
 * Update contract (draft only)
 */
export const updateContract = async (userId: string, contractId: string, updates: any) => {
  const contract = await Contract.findById(contractId).populate('propertyId landlordId');
  if (!contract) {
    throw Object.assign(new Error('Contract not found'), { statusCode: 404 });
  }

  if (contract.status !== 'draft') {
    throw Object.assign(
      new Error('Only draft contracts can be edited'),
      { statusCode: 400 }
    );
  }

  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = contract.propertyId as any;
  const isLandlord = property.landlordId.toString() === userId;
  const isStaff =
    user.role === 'staff' &&
    user.assignedPropertyIds?.some(id => id.toString() === property._id.toString());
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  Object.assign(contract, updates);
  await contract.save();

  return contract.populate(['applicationId', 'propertyId', 'unitId', 'landlordId', 'userId']);
};

/**
 * Add signature to contract
 */
export const addSignature = async (
  userId: string,
  contractId: string,
  signatureData: string,
  role: 'landlord' | 'tenant'
) => {
  const contract = await Contract.findById(contractId)
    .populate('propertyId landlordId userId');

  if (!contract) {
    throw Object.assign(new Error('Contract not found'), { statusCode: 404 });
  }

  const property = contract.propertyId as any;
  const landlord = contract.landlordId as any;
  const tenant = contract.userId as any;

  // Verify user can sign in this role
  if (role === 'landlord') {
    if (landlord._id.toString() !== userId) {
      throw Object.assign(new Error('Only the landlord can sign as landlord'), { statusCode: 403 });
    }
    contract.landlordSignature = signatureData;
  } else if (role === 'tenant') {
    if (tenant._id.toString() !== userId) {
      throw Object.assign(new Error('Only the tenant can sign as tenant'), { statusCode: 403 });
    }
    contract.userSignature = signatureData;
  }

  // If both signatures present, mark as signed
  if (contract.landlordSignature && contract.userSignature && contract.status === 'pending_signature') {
    contract.status = 'signed';
    contract.signedAt = new Date();

    // Notify both parties
    await Notification.create({
      userId: tenant._id,
      type: 'contract',
      title: 'Contract Fully Signed',
      message: `The lease contract for ${property.name} has been fully signed by both parties`,
      link: `/u/contracts/${contract._id}`
    });

    await Notification.create({
      userId: landlord._id,
      type: 'contract',
      title: 'Contract Fully Signed',
      message: `The lease contract for ${property.name} has been fully signed by both parties`,
      link: `/hub/contracts/${contract._id}`
    });
  } else {
    // Notify the other party that one signature is complete
    const notifyUserId = role === 'landlord' ? tenant._id : landlord._id;
    const signerName = role === 'landlord' ? landlord.name : tenant.name;

    await Notification.create({
      userId: notifyUserId,
      type: 'contract',
      title: 'Contract Signature Added',
      message: `${signerName} has signed the contract for ${property.name}. Awaiting your signature.`,
      link: role === 'landlord' ? `/u/contracts/${contract._id}` : `/hub/contracts/${contract._id}`
    });
  }

  await contract.save();

  return contract.populate(['applicationId', 'propertyId', 'unitId', 'landlordId', 'userId']);
};

/**
 * Update contract status
 */
export const updateStatus = async (userId: string, contractId: string, status: string) => {
  const contract = await Contract.findById(contractId).populate('propertyId landlordId userId');
  if (!contract) {
    throw Object.assign(new Error('Contract not found'), { statusCode: 404 });
  }

  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = contract.propertyId as any;
  const isLandlord = property.landlordId.toString() === userId;
  const isStaff =
    user.role === 'staff' &&
    user.assignedPropertyIds?.some(id => id.toString() === property._id.toString());
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  contract.status = status as any;
  await contract.save();

  const tenant = contract.userId as any;
  await Notification.create({
    userId: tenant._id,
    type: 'contract',
    title: 'Contract Status Updated',
    message: `Contract status changed to: ${status}`,
    link: `/u/contracts/${contract._id}`
  });

  return contract.populate(['applicationId', 'propertyId', 'unitId', 'landlordId', 'userId']);
};

/**
 * Generate PDF from contract
 */
export const generatePDF = async (userId: string, contractId: string) => {
  const contract: any = await Contract.findById(contractId)
    .populate('userId')
    .populate('propertyId')
    .populate('unitId')
    .populate('landlordId')
    .populate('applicationId');

  if (!contract) {
    throw Object.assign(new Error('Contract not found'), { statusCode: 404 });
  }

  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = contract.propertyId;
  const isOwner = contract.userId._id.toString() === userId;
  const isLandlord = contract.landlordId._id.toString() === userId;
  const isStaff =
    user.role === 'staff' &&
    user.assignedPropertyIds?.some(id => id.toString() === property._id.toString());
  const isAdmin = user.role === 'super_admin';

  if (!isOwner && !isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  const application = contract.applicationId;
  const unit = contract.unitId;
  const tenant = contract.userId;
  const landlord = contract.landlordId;

  // Prepare template data
  const templateData: ContractTemplateData = {
    contractId: contract._id.toString(),
    propertyName: property.name,
    propertyAddress: `${property.address.street}, ${property.address.barangay}, ${property.address.city}, ${property.address.province} ${property.address.zipCode}`,
    unitIdentifier: unit.unitIdentifier,
    landlordName: landlord.name,
    landlordAddress: undefined,
    tenantName: application.personalDetails.fullName,
    tenantAddress: application.personalDetails.address,
    tenantPhone: application.personalDetails.phone,
    tenantOccupation: application.personalDetails.occupation,
    emergencyContactName: application.personalDetails.emergencyContact.name,
    emergencyContactPhone: application.personalDetails.emergencyContact.phone,
    emergencyContactRelationship: application.personalDetails.emergencyContact.relationship,
    monthlyRent: contract.monthlyRent,
    securityDeposit: contract.securityDeposit,
    advancePayment: contract.advancePayment,
    startDate: contract.startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    endDate: contract.endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    lockInPeriod: contract.lockInPeriod,
    utilityIncludedInRent: contract.utilityIncludedInRent,
    rateType: contract.rateType,
    terms: contract.terms,
    landlordSignature: contract.landlordSignature,
    userSignature: contract.userSignature,
    signedAt: contract.signedAt
      ? contract.signedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : undefined
  };

  const html = generateContractHTML(templateData);

  // Generate PDF using Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const tempDir = os.tmpdir();
  const pdfPath = path.join(tempDir, `contract-${contract._id}.pdf`);

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    }
  });

  await browser.close();

  // Upload to Cloudinary
  const uploadResult = await cloudinary.uploader.upload(pdfPath, {
    folder: 'rentdito/contracts',
    resource_type: 'raw',
    public_id: `contract-${contract._id}`,
    overwrite: true
  });

  // Delete temp file
  fs.unlinkSync(pdfPath);

  // Save document URL
  contract.documentUrl = uploadResult.secure_url;
  await contract.save();

  return {
    documentUrl: uploadResult.secure_url,
    contract: await contract.populate(['applicationId', 'propertyId', 'unitId', 'landlordId', 'userId'])
  };
};

/**
 * Get download URL for contract PDF
 */
export const getDownloadUrl = async (userId: string, contractId: string) => {
  const contract: any = await getContractById(userId, contractId);

  if (!contract.documentUrl) {
    throw Object.assign(
      new Error('Contract PDF has not been generated yet'),
      { statusCode: 404 }
    );
  }

  return { documentUrl: contract.documentUrl };
};

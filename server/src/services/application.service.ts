import { RentalApplication, IRentalApplication } from '../models/RentalApplication';
import { User } from '../models/User';
import { Property } from '../models/Property';
import { Unit } from '../models/Unit';
import { Notification } from '../models/Notification';

/**
 * Create rental application (user must be verified, unit must be vacant)
 */
export const createApplication = async (
  userId: string,
  data: {
    propertyId: string;
    unitId: string;
    personalDetails: any;
    documents: string[];
  }
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  if (user.verificationStatus !== 'verified') {
    throw Object.assign(
      new Error('You must be verified to submit rental applications'),
      { statusCode: 403 }
    );
  }

  const property = await Property.findById(data.propertyId);
  if (!property) {
    throw Object.assign(new Error('Property not found'), { statusCode: 404 });
  }

  const unit = await Unit.findById(data.unitId);
  if (!unit) {
    throw Object.assign(new Error('Unit not found'), { statusCode: 404 });
  }

  if (unit.propertyId.toString() !== data.propertyId) {
    throw Object.assign(
      new Error('Unit does not belong to the specified property'),
      { statusCode: 400 }
    );
  }

  // Validate unit is vacant
  if (unit.status !== 'vacant') {
    throw Object.assign(
      new Error('Unit is not available for application'),
      { statusCode: 400 }
    );
  }

  // Check for existing pending/under_review application for same unit
  const existingApplication = await RentalApplication.findOne({
    userId,
    unitId: data.unitId,
    status: { $in: ['pending', 'under_review'] }
  });

  if (existingApplication) {
    throw Object.assign(
      new Error('You already have a pending application for this unit'),
      { statusCode: 409 }
    );
  }

  const application = await RentalApplication.create({
    userId,
    propertyId: data.propertyId,
    unitId: data.unitId,
    personalDetails: data.personalDetails,
    documents: data.documents,
    status: 'pending'
  });

  // Notify landlord
  await Notification.create({
    userId: property.landlordId,
    type: 'application',
    title: 'New Rental Application',
    message: `${user.name} submitted an application for ${unit.unitIdentifier} at ${property.name}`,
    link: `/hub/pipeline/applications/${application._id}`,
    metadata: {
      applicationId: application._id.toString(),
      propertyId: property._id.toString(),
      unitId: unit._id.toString()
    }
  });

  return application.populate(['userId', 'propertyId', 'unitId', 'reviewedBy']);
};

/**
 * Get user's own applications
 */
export const getMyApplications = async (userId: string) => {
  const applications = await RentalApplication.find({ userId })
    .populate('propertyId', 'name address images')
    .populate('unitId', 'unitIdentifier accommodationType roomRent bedspaceRent')
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 })
    .lean();

  return applications;
};

/**
 * Get applications for properties (landlord/staff only)
 */
export const getApplications = async (
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

  const applications = await RentalApplication.find(query)
    .populate('userId', 'name email phone avatar verificationStatus')
    .populate('propertyId', 'name address')
    .populate('unitId', 'unitIdentifier accommodationType roomRent bedspaceRent')
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 })
    .lean();

  return applications;
};

/**
 * Get application by ID
 */
export const getApplicationById = async (userId: string, applicationId: string) => {
  const application: any = await RentalApplication.findById(applicationId)
    .populate('userId', 'name email phone avatar verificationStatus')
    .populate('propertyId', 'name address landlordId')
    .populate('unitId', 'unitIdentifier accommodationType roomRent bedspaceRent deposit features images')
    .populate('reviewedBy', 'name email')
    .lean();

  if (!application) {
    throw Object.assign(new Error('Application not found'), { statusCode: 404 });
  }

  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  // Check access
  const isOwner = application.userId._id.toString() === userId;
  const isLandlord = application.propertyId.landlordId.toString() === userId;
  const isStaff =
    user.role === 'staff' &&
    user.assignedPropertyIds?.some(
      id => id.toString() === application.propertyId._id.toString()
    );
  const isAdmin = user.role === 'super_admin';

  if (!isOwner && !isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  return application;
};

/**
 * Set application to under_review
 */
export const reviewApplication = async (
  userId: string,
  applicationId: string,
  reviewNotes?: string
) => {
  const application = await RentalApplication.findById(applicationId).populate('propertyId userId unitId');
  if (!application) {
    throw Object.assign(new Error('Application not found'), { statusCode: 404 });
  }

  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = application.propertyId as any;
  const isLandlord = property.landlordId.toString() === userId;
  const isStaff =
    user.role === 'staff' &&
    user.assignedPropertyIds?.some(id => id.toString() === property._id.toString());
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  if (application.status !== 'pending') {
    throw Object.assign(
      new Error('Only pending applications can be set to under review'),
      { statusCode: 400 }
    );
  }

  application.status = 'under_review';
  application.reviewedBy = user._id as any;
  application.reviewedAt = new Date();
  if (reviewNotes) {
    application.reviewNotes = reviewNotes;
  }
  await application.save();

  // Notify user
  const applicant = application.userId as any;
  await Notification.create({
    userId: application.userId,
    type: 'application',
    title: 'Application Under Review',
    message: `Your application for ${property.name} is now under review`,
    link: `/u/applications/${application._id}`
  });

  return application.populate(['userId', 'propertyId', 'unitId', 'reviewedBy']);
};

/**
 * Approve application (does NOT create tenancy yet)
 */
export const approveApplication = async (
  userId: string,
  applicationId: string,
  reviewNotes?: string
) => {
  const application = await RentalApplication.findById(applicationId).populate('propertyId userId unitId');
  if (!application) {
    throw Object.assign(new Error('Application not found'), { statusCode: 404 });
  }

  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = application.propertyId as any;
  const isLandlord = property.landlordId.toString() === userId;
  const isStaff =
    user.role === 'staff' &&
    user.assignedPropertyIds?.some(id => id.toString() === property._id.toString());
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  if (application.status === 'approved') {
    throw Object.assign(new Error('Application is already approved'), { statusCode: 400 });
  }

  if (application.status === 'rejected') {
    throw Object.assign(new Error('Cannot approve a rejected application'), { statusCode: 400 });
  }

  // Verify unit is still vacant
  const unit = application.unitId as any;
  const currentUnit = await Unit.findById(unit._id);
  if (!currentUnit || currentUnit.status !== 'vacant') {
    throw Object.assign(
      new Error('Unit is no longer available'),
      { statusCode: 400 }
    );
  }

  application.status = 'approved';
  application.reviewedBy = user._id as any;
  application.reviewedAt = new Date();
  if (reviewNotes) {
    application.reviewNotes = reviewNotes;
  }
  await application.save();

  // Notify user
  const applicant = application.userId as any;
  await Notification.create({
    userId: application.userId,
    type: 'application',
    title: 'Application Approved',
    message: `Congratulations! Your application for ${unit.unitIdentifier} at ${property.name} has been approved`,
    link: `/u/applications/${application._id}`,
    metadata: {
      applicationId: application._id.toString(),
      propertyId: property._id.toString(),
      unitId: unit._id.toString()
    }
  });

  return application.populate(['userId', 'propertyId', 'unitId', 'reviewedBy']);
};

/**
 * Reject application (with review notes required)
 */
export const rejectApplication = async (
  userId: string,
  applicationId: string,
  reviewNotes: string
) => {
  const application = await RentalApplication.findById(applicationId).populate('propertyId userId unitId');
  if (!application) {
    throw Object.assign(new Error('Application not found'), { statusCode: 404 });
  }

  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = application.propertyId as any;
  const isLandlord = property.landlordId.toString() === userId;
  const isStaff =
    user.role === 'staff' &&
    user.assignedPropertyIds?.some(id => id.toString() === property._id.toString());
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  if (application.status === 'rejected') {
    throw Object.assign(new Error('Application is already rejected'), { statusCode: 400 });
  }

  if (application.status === 'approved') {
    throw Object.assign(new Error('Cannot reject an approved application'), { statusCode: 400 });
  }

  application.status = 'rejected';
  application.reviewedBy = user._id as any;
  application.reviewedAt = new Date();
  application.reviewNotes = reviewNotes;
  await application.save();

  // Notify user
  const applicant = application.userId as any;
  const unit = application.unitId as any;
  await Notification.create({
    userId: application.userId,
    type: 'application',
    title: 'Application Rejected',
    message: `Your application for ${unit.unitIdentifier} at ${property.name} has been rejected`,
    link: `/u/applications/${application._id}`,
    metadata: {
      applicationId: application._id.toString(),
      propertyId: property._id.toString(),
      unitId: unit._id.toString()
    }
  });

  return application.populate(['userId', 'propertyId', 'unitId', 'reviewedBy']);
};

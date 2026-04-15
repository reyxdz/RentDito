import { LandlordApplication } from '../models/LandlordApplication';
import { User } from '../models/User';

/**
 * Submit a landlord application. User must be verified.
 */
export const apply = async (userId: string, data: {
  businessName: string;
  businessType: string;
  documents?: string[];
}) => {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  if (user.verificationStatus !== 'verified') {
    throw Object.assign(
      new Error('You must verify your identity before applying to become a landlord.'),
      { statusCode: 403 }
    );
  }

  if (user.role !== 'user') {
    throw Object.assign(
      new Error('Only users with role "user" can apply to become a landlord.'),
      { statusCode: 400 }
    );
  }

  // Check for existing pending application
  const existing = await LandlordApplication.findOne({ userId, status: 'pending' });
  if (existing) {
    throw Object.assign(
      new Error('You already have a pending application.'),
      { statusCode: 409 }
    );
  }

  const application = await LandlordApplication.create({
    userId,
    businessName: data.businessName,
    businessType: data.businessType,
    documents: data.documents || [],
  });

  return application;
};

/**
 * Get the current user's landlord application.
 */
export const getMyApplication = async (userId: string) => {
  const application = await LandlordApplication.findOne({ userId })
    .sort({ createdAt: -1 })
    .populate('reviewedBy', 'name email');
  return application;
};

/**
 * Get all landlord applications (admin only). Supports filtering by status.
 */
export const getAll = async (status?: string) => {
  const filter: any = {};
  if (status) filter.status = status;

  const applications = await LandlordApplication.find(filter)
    .populate('userId', 'name email phone verificationStatus avatar')
    .populate('reviewedBy', 'name email')
    .sort({ createdAt: -1 });

  return applications;
};

/**
 * Approve a landlord application → promote user role to 'landlord'.
 */
export const approve = async (applicationId: string, adminId: string) => {
  const application = await LandlordApplication.findById(applicationId);
  if (!application) {
    throw Object.assign(new Error('Application not found'), { statusCode: 404 });
  }

  if (application.status !== 'pending') {
    throw Object.assign(
      new Error(`Application has already been ${application.status}.`),
      { statusCode: 400 }
    );
  }

  // Promote user role
  const user = await User.findById(application.userId);
  if (!user) {
    throw Object.assign(new Error('Applicant user not found'), { statusCode: 404 });
  }

  user.role = 'landlord';
  await user.save();

  application.status = 'approved';
  application.reviewedBy = adminId as any;
  application.reviewedAt = new Date();
  await application.save();

  return application;
};

/**
 * Reject a landlord application.
 */
export const reject = async (applicationId: string, adminId: string, reviewNotes?: string) => {
  const application = await LandlordApplication.findById(applicationId);
  if (!application) {
    throw Object.assign(new Error('Application not found'), { statusCode: 404 });
  }

  if (application.status !== 'pending') {
    throw Object.assign(
      new Error(`Application has already been ${application.status}.`),
      { statusCode: 400 }
    );
  }

  application.status = 'rejected';
  application.reviewedBy = adminId as any;
  application.reviewedAt = new Date();
  application.reviewNotes = reviewNotes;
  await application.save();

  return application;
};

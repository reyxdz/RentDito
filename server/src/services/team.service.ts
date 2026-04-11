import crypto from 'crypto';
import { User } from '../models/User';
import { hash } from '../utils/password';
import transporter from '../config/mailer';

/**
 * Get all staff belonging to a landlord.
 */
export const getStaff = async (landlordId: string) => {
  const staff = await User.find({ landlordId, role: 'staff' })
    .select('-passwordHash')
    .populate('assignedPropertyIds', 'name')
    .sort({ createdAt: -1 });

  return staff;
};

/**
 * Invite a new staff member.
 * Creates a User with role=staff, generates a temp password, and emails it.
 */
export const inviteStaff = async (
  landlordId: string,
  data: {
    name: string;
    email: string;
    positionName?: string;
    permissions?: string[];
    assignedPropertyIds?: string[];
  }
) => {
  // Check for existing email
  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing) {
    throw Object.assign(new Error('A user with this email already exists.'), { statusCode: 409 });
  }

  // Generate temp password
  const tempPassword = crypto.randomBytes(6).toString('hex'); // 12-char random string
  const passwordHash = await hash(tempPassword);

  const staff = await User.create({
    name: data.name,
    email: data.email.toLowerCase(),
    passwordHash,
    role: 'staff',
    landlordId,
    positionName: data.positionName || 'Staff',
    permissions: data.permissions || ['dashboard'],
    assignedPropertyIds: data.assignedPropertyIds || [],
    verificationStatus: 'verified', // Staff are pre-verified by landlord
  });

  // Send invitation email with temp password
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@rentdito.com',
      to: data.email,
      subject: 'RentDito - You have been invited as staff',
      html: `
        <h2>Welcome to RentDito!</h2>
        <p>You have been invited as a <strong>${data.positionName || 'Staff'}</strong> member.</p>
        <p>Here are your temporary login credentials:</p>
        <ul>
          <li><strong>Email:</strong> ${data.email}</li>
          <li><strong>Password:</strong> ${tempPassword}</li>
        </ul>
        <p>Please log in and change your password immediately.</p>
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login">Log in to RentDito</a>
      `,
    });
  } catch (err) {
    // Don't fail the invite if email fails — staff is already created
    console.error('Failed to send staff invitation email:', err);
  }

  // Return without sensitive fields
  const { passwordHash: _, ...result } = staff.toObject();
  return result;
};

/**
 * Update a staff member's permissions.
 */
export const updatePermissions = async (
  staffId: string,
  landlordId: string,
  permissions: string[]
) => {
  const staff = await User.findOne({ _id: staffId, landlordId, role: 'staff' });
  if (!staff) {
    throw Object.assign(new Error('Staff member not found.'), { statusCode: 404 });
  }

  staff.permissions = permissions;
  await staff.save();

  const { passwordHash: _, ...result } = staff.toObject();
  return result;
};

/**
 * Update a staff member's assigned properties.
 */
export const updateAssignedProperties = async (
  staffId: string,
  landlordId: string,
  propertyIds: string[]
) => {
  const staff = await User.findOne({ _id: staffId, landlordId, role: 'staff' });
  if (!staff) {
    throw Object.assign(new Error('Staff member not found.'), { statusCode: 404 });
  }

  staff.assignedPropertyIds = propertyIds as any;
  await staff.save();

  const { passwordHash: _, ...result } = staff.toObject();
  return result;
};

/**
 * Remove a staff member (delete their account).
 */
export const removeStaff = async (staffId: string, landlordId: string) => {
  const staff = await User.findOne({ _id: staffId, landlordId, role: 'staff' });
  if (!staff) {
    throw Object.assign(new Error('Staff member not found.'), { statusCode: 404 });
  }

  await User.findByIdAndDelete(staffId);
};

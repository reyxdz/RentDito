import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'user' | 'landlord' | 'staff' | 'super_admin';
export type UserStatus = 'active' | 'suspended';
export type VerificationStatus = 'unverified' | 'pending' | 'verified';

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  verificationStatus: VerificationStatus;
  idPhotos?: string[];
  avatar?: string;
  // Staff-specific
  landlordId?: mongoose.Types.ObjectId;
  assignedPropertyIds?: mongoose.Types.ObjectId[];
  permissions?: string[];
  positionName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'landlord', 'staff', 'super_admin'], default: 'user' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    verificationStatus: { type: String, enum: ['unverified', 'pending', 'verified'], default: 'unverified' },
    idPhotos: [{ type: String }],
    avatar: { type: String },
    // Staff-specific
    landlordId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedPropertyIds: [{ type: Schema.Types.ObjectId, ref: 'Property' }],
    permissions: [{ type: String }],
    positionName: { type: String },
  },
  { timestamps: true }
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ landlordId: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);

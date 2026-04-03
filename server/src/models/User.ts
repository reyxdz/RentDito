import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'admin' | 'landlord' | 'tenant';
export type UserStatus = 'Active' | 'Pending' | 'Suspended';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  isVerified: boolean;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'landlord', 'tenant'], required: true },
    status: { type: String, enum: ['Active', 'Pending', 'Suspended'], default: 'Pending' },
    isVerified: { type: Boolean, default: false },
    avatar: { type: String },
  },
  { timestamps: true }
);

// Indexes for fast querying
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);

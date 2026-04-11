import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'super_admin' | 'landlord' | 'staff' | 'tenant';
export type UserStatus = 'active' | 'pending' | 'suspended';

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  isVerified: boolean;
  avatar?: string;
  
  // For staff role
  positionName?: string;
  landlordId?: mongoose.Types.ObjectId;
  assignedPropertyIds?: mongoose.Types.ObjectId[];
  permissions?: string[];
  
  // For tenant role
  currentUnitId?: mongoose.Types.ObjectId;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  
  // Auth
  refreshToken?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['super_admin', 'landlord', 'staff', 'tenant'], required: true },
    status: { type: String, enum: ['active', 'pending', 'suspended'], default: 'pending' },
    isVerified: { type: Boolean, default: false },
    avatar: { type: String },
    
    // Staff specific
    positionName: { type: String },
    landlordId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedPropertyIds: [{ type: Schema.Types.ObjectId, ref: 'Property' }],
    permissions: [{ type: String }],
    
    // Tenant specific
    currentUnitId: { type: Schema.Types.ObjectId, ref: 'Unit' },
    emergencyContact: {
      name: { type: String },
      phone: { type: String },
      relation: { type: String },
    },
    
    refreshToken: { type: String },
  },
  { timestamps: true }
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ landlordId: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);

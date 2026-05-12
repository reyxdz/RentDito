import mongoose, { Schema, Document } from 'mongoose';

export type TenancyStatus = 'pending' | 'checked_in' | 'checked_out';

export interface IHouseholdMember {
  name: string;
  relation: string;
}

export interface IPersonalDetails {
  fullName: string;
  phone: string;
  occupation: string;
  school?: string;
  address: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface ITenancy extends Document {
  userId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  unitId: mongoose.Types.ObjectId;
  contractId: mongoose.Types.ObjectId;
  status: TenancyStatus;
  checkInDate?: Date;
  checkOutDate?: Date;
  // Occupancy
  slotNumber?: number;
  isPrimary: boolean;
  householdMembers?: IHouseholdMember[];
  // Copied from RentalApplication at check-in time
  personalDetails: IPersonalDetails;
  createdAt: Date;
  updatedAt: Date;
}

const HouseholdMemberSchema = new Schema<IHouseholdMember>({
  name: { type: String, required: true, trim: true },
  relation: { type: String, required: true, trim: true }
}, { _id: false });

const PersonalDetailsSchema = new Schema<IPersonalDetails>({
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  occupation: { type: String, required: true, trim: true },
  school: { type: String, trim: true },
  address: { type: String, required: true, trim: true },
  emergencyContact: {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    relationship: { type: String, required: true, trim: true }
  }
}, { _id: false });

const TenancySchema = new Schema<ITenancy>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true
    },
    unitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      required: true
    },
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'checked_in', 'checked_out'],
      default: 'checked_in'
    },
    checkInDate: {
      type: Date
    },
    checkOutDate: {
      type: Date
    },
    // Bedspace mode: which slot the tenant occupies
    slotNumber: {
      type: Number,
      min: 1
    },
    // Whole-room mode: primary occupant flag
    isPrimary: {
      type: Boolean,
      default: true
    },
    householdMembers: [HouseholdMemberSchema],
    personalDetails: {
      type: PersonalDetailsSchema,
      required: true
    }
  },
  { timestamps: true }
);

// Indexes for efficient querying
TenancySchema.index({ userId: 1, status: 1 });
TenancySchema.index({ propertyId: 1, status: 1 });
TenancySchema.index({ unitId: 1, status: 1 });
TenancySchema.index({ contractId: 1 });
TenancySchema.index({ status: 1, createdAt: -1 });

export const Tenancy = mongoose.model<ITenancy>('Tenancy', TenancySchema);

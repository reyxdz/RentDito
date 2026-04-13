import mongoose, { Schema, Document } from 'mongoose';

export type ContractStatus = 
  | 'draft' 
  | 'pending_review' 
  | 'pending_signature' 
  | 'signed' 
  | 'active' 
  | 'expired' 
  | 'terminated';

export type RateType = 'fixed' | 'submetered';

export interface IContract extends Document {
  applicationId: mongoose.Types.ObjectId;
  tenancyId?: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  unitId: mongoose.Types.ObjectId;
  landlordId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  lockInPeriod: number; // in months
  monthlyRent: number;
  securityDeposit: number;
  advancePayment: number;
  utilityIncludedInRent: boolean;
  rateType: RateType;
  terms?: string;
  landlordSignature?: string; // base64
  userSignature?: string; // base64
  signedAt?: Date;
  status: ContractStatus;
  documentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContractSchema = new Schema<IContract>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'RentalApplication',
      required: true
    },
    tenancyId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenancy'
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
    landlordId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    lockInPeriod: {
      type: Number,
      required: true,
      min: 0
    },
    monthlyRent: {
      type: Number,
      required: true,
      min: 0
    },
    securityDeposit: {
      type: Number,
      required: true,
      min: 0
    },
    advancePayment: {
      type: Number,
      required: true,
      min: 0
    },
    utilityIncludedInRent: {
      type: Boolean,
      default: false
    },
    rateType: {
      type: String,
      enum: ['fixed', 'submetered'],
      default: 'fixed'
    },
    terms: {
      type: String,
      trim: true
    },
    landlordSignature: {
      type: String
    },
    userSignature: {
      type: String
    },
    signedAt: {
      type: Date
    },
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'pending_signature', 'signed', 'active', 'expired', 'terminated'],
      default: 'draft'
    },
    documentUrl: {
      type: String
    }
  },
  { timestamps: true }
);

// Indexes for efficient querying
ContractSchema.index({ userId: 1, status: 1 });
ContractSchema.index({ landlordId: 1, status: 1 });
ContractSchema.index({ propertyId: 1, status: 1 });
ContractSchema.index({ unitId: 1, status: 1 });
ContractSchema.index({ applicationId: 1 });
ContractSchema.index({ tenancyId: 1 });
ContractSchema.index({ status: 1, createdAt: -1 });

export const Contract = mongoose.model<IContract>('Contract', ContractSchema);

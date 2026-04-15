import mongoose, { Schema, Document } from 'mongoose';

export type ApplicationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

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

export interface IRentalApplication extends Document {
  userId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  unitId: mongoose.Types.ObjectId;
  personalDetails: IPersonalDetails;
  documents: string[];
  status: ApplicationStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewNotes?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

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

const RentalApplicationSchema = new Schema<IRentalApplication>(
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
    personalDetails: {
      type: PersonalDetailsSchema,
      required: true
    },
    documents: [{ type: String }],
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected'],
      default: 'pending'
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewNotes: {
      type: String,
      trim: true
    },
    reviewedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

// Indexes for efficient querying
RentalApplicationSchema.index({ userId: 1, createdAt: -1 });
RentalApplicationSchema.index({ propertyId: 1, status: 1 });
RentalApplicationSchema.index({ unitId: 1, status: 1 });
RentalApplicationSchema.index({ status: 1, createdAt: -1 });

// Compound index to prevent duplicate pending applications for same unit
RentalApplicationSchema.index(
  { userId: 1, unitId: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { 
      status: { $in: ['pending', 'under_review'] } 
    }
  }
);

export const RentalApplication = mongoose.model<IRentalApplication>('RentalApplication', RentalApplicationSchema);

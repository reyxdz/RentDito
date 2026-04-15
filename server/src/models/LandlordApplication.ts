import mongoose, { Schema, Document } from 'mongoose';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface ILandlordApplication extends Document {
  userId: mongoose.Types.ObjectId;
  businessName: string;
  businessType: string;
  documents: string[];
  status: ApplicationStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LandlordApplicationSchema = new Schema<ILandlordApplication>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    businessName: { type: String, required: true, trim: true },
    businessType: { type: String, required: true, trim: true },
    documents: [{ type: String }],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNotes: { type: String },
  },
  { timestamps: true }
);

// Indexes
LandlordApplicationSchema.index({ userId: 1 });
LandlordApplicationSchema.index({ status: 1 });

export const LandlordApplication = mongoose.model<ILandlordApplication>(
  'LandlordApplication',
  LandlordApplicationSchema
);

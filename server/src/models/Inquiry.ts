import mongoose, { Schema, Document } from 'mongoose';

export type InquiryStatus = 'open' | 'in_progress' | 'closed' | 'converted';

export interface IInquiry extends Document {
  userId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  unitId?: mongoose.Types.ObjectId;
  subject: string;
  status: InquiryStatus;
  createdAt: Date;
  updatedAt: Date;
}

const InquirySchema = new Schema<IInquiry>(
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
      ref: 'Unit'
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'closed', 'converted'],
      default: 'open'
    }
  },
  { timestamps: true }
);

// Indexes for efficient querying
InquirySchema.index({ userId: 1, createdAt: -1 });
InquirySchema.index({ propertyId: 1, status: 1 });
InquirySchema.index({ status: 1, createdAt: -1 });

export const Inquiry = mongoose.model<IInquiry>('Inquiry', InquirySchema);

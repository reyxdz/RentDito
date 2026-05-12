import mongoose, { Schema, Document } from 'mongoose';

export type TransferRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface ITransferRequest extends Document {
  tenancyId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  fromUnitId: mongoose.Types.ObjectId;
  toUnitId: mongoose.Types.ObjectId;
  reason: string;
  status: TransferRequestStatus;
  initiatedByUserId: mongoose.Types.ObjectId;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewNotes?: string;
  reviewedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TransferRequestSchema = new Schema<ITransferRequest>(
  {
    tenancyId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenancy',
      required: true
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true
    },
    fromUnitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      required: true
    },
    toUnitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      required: true
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending'
    },
    initiatedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
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
    },
    completedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

TransferRequestSchema.index({ tenancyId: 1, status: 1 });
TransferRequestSchema.index({ propertyId: 1, status: 1 });
TransferRequestSchema.index({ initiatedByUserId: 1, createdAt: -1 });
TransferRequestSchema.index({ fromUnitId: 1, toUnitId: 1 });
TransferRequestSchema.index({ createdAt: -1 });

export const TransferRequest = mongoose.model<ITransferRequest>('TransferRequest', TransferRequestSchema);

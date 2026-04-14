import mongoose, { Schema, Document } from 'mongoose';

export type VisitPurpose = 'viewing' | 'inspection';
export type VisitStatus = 'pending' | 'approved' | 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface IVisitRequest extends Document {
  userId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  unitId?: mongoose.Types.ObjectId;
  requestedDate: Date;
  requestedTime: string;
  scheduledDate?: Date;
  scheduledTime?: string;
  purpose: VisitPurpose;
  status: VisitStatus;
  assignedStaffId?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VisitRequestSchema = new Schema<IVisitRequest>(
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
    requestedDate: {
      type: Date,
      required: true
    },
    requestedTime: {
      type: String,
      required: true
    },
    scheduledDate: {
      type: Date
    },
    scheduledTime: {
      type: String
    },
    purpose: {
      type: String,
      enum: ['viewing', 'inspection'],
      default: 'viewing'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'scheduled', 'completed', 'cancelled', 'no_show'],
      default: 'pending'
    },
    assignedStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

// Indexes for efficient querying
VisitRequestSchema.index({ userId: 1, createdAt: -1 });
VisitRequestSchema.index({ propertyId: 1, status: 1 });
VisitRequestSchema.index({ assignedStaffId: 1, status: 1 });
VisitRequestSchema.index({ scheduledDate: 1, scheduledTime: 1 });

export const VisitRequest = mongoose.model<IVisitRequest>('VisitRequest', VisitRequestSchema);

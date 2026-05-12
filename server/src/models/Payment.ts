import mongoose, { Schema, Document } from 'mongoose';

export type PaymentMethod = 'cash' | 'gcash' | 'bank_transfer' | 'other';

export interface IPayment extends Document {
  billId: mongoose.Types.ObjectId;
  tenancyId: mongoose.Types.ObjectId;
  amount: number;
  paymentDate: Date;
  method: PaymentMethod;
  referenceNumber?: string;
  proofImageUrl?: string;
  recordedByUserId: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    billId: {
      type: Schema.Types.ObjectId,
      ref: 'Bill',
      required: true
    },
    tenancyId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenancy',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01
    },
    paymentDate: {
      type: Date,
      required: true
    },
    method: {
      type: String,
      enum: ['cash', 'gcash', 'bank_transfer', 'other'],
      required: true
    },
    referenceNumber: {
      type: String,
      trim: true
    },
    proofImageUrl: {
      type: String
    },
    recordedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    notes: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

// Indexes for efficient querying
PaymentSchema.index({ billId: 1, createdAt: -1 });
PaymentSchema.index({ tenancyId: 1, createdAt: -1 });
PaymentSchema.index({ recordedByUserId: 1 });
PaymentSchema.index({ paymentDate: -1 });
PaymentSchema.index({ method: 1 });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);

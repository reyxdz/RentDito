import mongoose, { Schema, Document } from 'mongoose';

export type InventoryRecordStatus = 'active' | 'returned' | 'damaged' | 'lost';
export type InventoryCondition = 'new' | 'good' | 'fair' | 'poor' | 'damaged';

export interface IInventoryRecord extends Document {
  inventoryItemId: mongoose.Types.ObjectId;
  tenancyId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  unitId?: mongoose.Types.ObjectId;
  issuedByUserId: mongoose.Types.ObjectId;
  issuedDate: Date;
  quantityIssued: number;
  issuedCondition: InventoryCondition;
  returnDate?: Date;
  returnCondition?: InventoryCondition;
  damageNotes?: string;
  penaltyAmount?: number;
  deductedFromDeposit?: boolean;
  signedFormUrl?: string;
  status: InventoryRecordStatus;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryRecordSchema = new Schema<IInventoryRecord>(
  {
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true
    },
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
    unitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit'
    },
    issuedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    issuedDate: {
      type: Date,
      default: Date.now
    },
    quantityIssued: {
      type: Number,
      min: 1,
      default: 1
    },
    issuedCondition: {
      type: String,
      enum: ['new', 'good', 'fair', 'poor', 'damaged'],
      required: true
    },
    returnDate: {
      type: Date
    },
    returnCondition: {
      type: String,
      enum: ['new', 'good', 'fair', 'poor', 'damaged']
    },
    damageNotes: {
      type: String,
      trim: true
    },
    penaltyAmount: {
      type: Number,
      min: 0
    },
    deductedFromDeposit: {
      type: Boolean,
      default: false
    },
    signedFormUrl: {
      type: String
    },
    status: {
      type: String,
      enum: ['active', 'returned', 'damaged', 'lost'],
      default: 'active'
    }
  },
  { timestamps: true }
);

InventoryRecordSchema.index({ tenancyId: 1, status: 1 });
InventoryRecordSchema.index({ propertyId: 1, status: 1 });
InventoryRecordSchema.index({ inventoryItemId: 1, status: 1 });
InventoryRecordSchema.index({ issuedByUserId: 1, issuedDate: -1 });
InventoryRecordSchema.index({ updatedAt: -1 });

export const InventoryRecord = mongoose.model<IInventoryRecord>('InventoryRecord', InventoryRecordSchema);

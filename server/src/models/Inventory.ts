import mongoose, { Schema, Document } from 'mongoose';

export type InventoryCondition = 'new' | 'good' | 'fair' | 'poor' | 'damaged';
export type InventoryStatus = 'available' | 'issued' | 'maintenance' | 'retired';

export interface IInventory extends Document {
  propertyId: mongoose.Types.ObjectId;
  itemName: string;
  serialNumber?: string;
  condition: InventoryCondition;
  quantity: number;
  availableQuantity: number;
  status: InventoryStatus;
  purchaseDate?: Date;
  purchaseCost?: number;
  createdAt: Date;
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true
    },
    itemName: {
      type: String,
      required: true,
      trim: true
    },
    serialNumber: {
      type: String,
      trim: true
    },
    condition: {
      type: String,
      enum: ['new', 'good', 'fair', 'poor', 'damaged'],
      default: 'good'
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    availableQuantity: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['available', 'issued', 'maintenance', 'retired'],
      default: 'available'
    },
    purchaseDate: {
      type: Date
    },
    purchaseCost: {
      type: Number,
      min: 0
    }
  },
  { timestamps: true }
);

InventorySchema.pre('validate', function() {
  if (this.availableQuantity === undefined || this.availableQuantity === null) {
    this.availableQuantity = this.quantity;
  }
  if (this.availableQuantity > this.quantity) {
    this.availableQuantity = this.quantity;
  }
});

InventorySchema.index({ propertyId: 1, status: 1 });
InventorySchema.index({ propertyId: 1, condition: 1 });
InventorySchema.index({ propertyId: 1, itemName: 1 });
InventorySchema.index(
  { propertyId: 1, serialNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { serialNumber: { $exists: true, $ne: '' } }
  }
);

export const Inventory = mongoose.model<IInventory>('Inventory', InventorySchema);

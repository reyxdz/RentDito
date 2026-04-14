import mongoose, { Schema, Document } from 'mongoose';

export type UnitStatus = 'vacant' | 'occupied' | 'reserved' | 'maintenance';
export type AccommodationType = 'room' | 'bedspace';

export interface ISlot {
  slotNumber: number;
  status: 'vacant' | 'occupied' | 'reserved';
  tenancyId?: mongoose.Types.ObjectId;
}

export interface IUnit extends Document {
  propertyId: mongoose.Types.ObjectId;
  unitIdentifier: string;
  accommodationType: AccommodationType;
  roomRent?: number;
  bedspaceRent?: number;
  perHeadRate?: number;
  deposit: number;
  capacity: number;
  maxOccupants: number;
  sizeSqm?: number;
  features: string[];
  images: string[];
  status: UnitStatus;
  slots?: ISlot[];
  createdAt: Date;
  updatedAt: Date;
}

const SlotSchema = new Schema<ISlot>({
  slotNumber: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['vacant', 'occupied', 'reserved'], 
    default: 'vacant' 
  },
  tenancyId: { type: Schema.Types.ObjectId, ref: 'Tenancy' }
}, { _id: false });

const UnitSchema = new Schema<IUnit>(
  {
    propertyId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Property', 
      required: true 
    },
    unitIdentifier: { type: String, required: true, trim: true },
    accommodationType: {
      type: String,
      enum: ['room', 'bedspace'],
      required: true
    },
    roomRent: { type: Number, min: 0 },
    bedspaceRent: { type: Number, min: 0 },
    perHeadRate: { type: Number, min: 0 },
    deposit: { type: Number, required: true, min: 0 },
    capacity: { type: Number, required: true, min: 1 },
    maxOccupants: { type: Number, required: true, min: 1 },
    sizeSqm: { type: Number, min: 0 },
    features: [{ type: String }],
    images: [{ type: String }],
    status: { 
      type: String, 
      enum: ['vacant', 'occupied', 'reserved', 'maintenance'], 
      default: 'vacant' 
    },
    slots: [SlotSchema]
  },
  { timestamps: true }
);

// Prevent duplicate unit identifiers within the exact same property
UnitSchema.index({ propertyId: 1, unitIdentifier: 1 }, { unique: true });

// Auto-update property metrics when unit is created/updated/deleted
UnitSchema.post('save', async function() {
  await updatePropertyMetrics(this.propertyId);
});

UnitSchema.post('findOneAndUpdate', async function(doc) {
  if (doc) {
    await updatePropertyMetrics(doc.propertyId);
  }
});

UnitSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    await updatePropertyMetrics(doc.propertyId);
  }
});

UnitSchema.post('deleteMany', async function() {
  // For bulk deletes, we can't easily track which properties were affected
  // This is a limitation, but deleteMany should be used sparingly
});

async function updatePropertyMetrics(propertyId: mongoose.Types.ObjectId) {
  const Property = mongoose.model('Property');
  const Unit = mongoose.model('Unit');
  
  const totalUnits = await Unit.countDocuments({ propertyId });
  const occupiedUnits = await Unit.countDocuments({ 
    propertyId, 
    status: 'occupied' 
  });
  const vacantUnits = await Unit.countDocuments({ 
    propertyId, 
    status: 'vacant' 
  });
  
  await Property.findByIdAndUpdate(propertyId, {
    $set: {
      totalUnits,
      occupiedUnits,
      vacantUnits,
      occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0
    }
  });
}

export const Unit = mongoose.model<IUnit>('Unit', UnitSchema);

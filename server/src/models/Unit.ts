import mongoose, { Schema, Document } from 'mongoose';

export type UnitStatus = 'Vacant' | 'Occupied' | 'Maintenance';

export interface IUnit extends Document {
  propertyId: mongoose.Types.ObjectId; // Relation to Property
  unitIdentifier: string; // e.g., "Apt 101" or "Room A"
  capacity: number;
  monthlyRent: number;
  sizeSqm?: number;
  status: UnitStatus;
  currentTenantId?: mongoose.Types.ObjectId; // Optional Relation to User (Tenant)
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}

const UnitSchema = new Schema<IUnit>(
  {
    propertyId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Property', 
      required: true 
    },
    unitIdentifier: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    monthlyRent: { type: Number, required: true, min: 0 },
    sizeSqm: { type: Number },
    status: { 
      type: String, 
      enum: ['Vacant', 'Occupied', 'Maintenance'], 
      default: 'Vacant' 
    },
    currentTenantId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User' 
    },
    features: [{ type: String }],
  },
  { timestamps: true }
);

// Prevent duplicate unit identifiers within the exact same property
UnitSchema.index({ propertyId: 1, unitIdentifier: 1 }, { unique: true });

export const Unit = mongoose.model<IUnit>('Unit', UnitSchema);

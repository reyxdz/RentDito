import mongoose, { Schema, Document } from 'mongoose';

export type PropertyStatus = 'Active' | 'Inactive' | 'Maintenance' | 'Archived';

export interface IProperty extends Document {
  landlordId: mongoose.Types.ObjectId;  // Relation to User
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  amenities: string[];
  status: PropertyStatus;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

const PropertySchema = new Schema<IProperty>(
  {
    landlordId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, default: 'Philippines' },
    },
    amenities: [{ type: String }],
    status: { 
      type: String, 
      enum: ['Active', 'Inactive', 'Maintenance', 'Archived'], 
      default: 'Inactive' 
    },
    images: [{ type: String }], // Array of image URLs
  },
  { timestamps: true }
);

// Indexing for quick filtering by owner or location
PropertySchema.index({ landlordId: 1 });
PropertySchema.index({ 'address.city': 1 });

export const Property = mongoose.model<IProperty>('Property', PropertySchema);

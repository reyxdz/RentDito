import mongoose, { Schema, Document } from 'mongoose';

export type PropertyStatus = 'Active' | 'Inactive' | 'Maintenance' | 'Archived';
export type PropertyType = 'Boarding House' | 'Apartment' | 'Studio' | 'Dormitory' | 'Commercial' | 'Parking' | 'Land' | 'Mixed Use';

export interface IProperty extends Document {
  landlordId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  address: {
    street: string;
    barangay?: string;
    city: string;
    province: string;
    zipCode: string;
    country: string;
  };
  amenities: string[];
  inclusions: string[];
  propertyType: PropertyType;
  status: PropertyStatus;
  images: string[];

  // Nearby venues
  venues: {
    reviewCenters: Array<{ name: string; distance: string }>;
    schools: Array<{ name: string; distance: string }>;
    commercial: Array<{ name: string; distance: string }>;
  };

  // Billing settings
  billingSettings: {
    billingDay: number;
    dueDay: number;
    lateFeePercent: number;
    utilityDefault: 'included' | 'metered' | 'shared';
  };

  // Emergency contacts
  emergencyContacts: Array<{
    name: string;
    phone: string;
    role: string;
  }>;

  // Geographic coordinates
  geoCoords?: {
    latitude: number;
    longitude: number;
  };

  // Persisted metrics (updated by Unit post-hooks)
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;

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
      barangay: { type: String },
      city: { type: String, required: true },
      province: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, default: 'Philippines' },
    },
    amenities: [{ type: String }],
    inclusions: [{ type: String }],
    propertyType: {
      type: String,
      enum: ['Boarding House', 'Apartment', 'Studio', 'Dormitory', 'Commercial', 'Parking', 'Land', 'Mixed Use'],
      required: true
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Maintenance', 'Archived'],
      default: 'Active'
    },
    images: [{ type: String }],

    // Persisted metrics (auto-updated by Unit model hooks)
    totalUnits: { type: Number, default: 0 },
    occupiedUnits: { type: Number, default: 0 },
    vacantUnits: { type: Number, default: 0 },
    occupancyRate: { type: Number, default: 0 },

    venues: {
      reviewCenters: [{
        name: { type: String },
        distance: { type: String }
      }],
      schools: [{
        name: { type: String },
        distance: { type: String }
      }],
      commercial: [{
        name: { type: String },
        distance: { type: String }
      }]
    },

    billingSettings: {
      billingDay: { type: Number, default: 1, min: 1, max: 31 },
      dueDay: { type: Number, default: 5, min: 1, max: 31 },
      lateFeePercent: { type: Number, default: 5, min: 0, max: 100 },
      utilityDefault: {
        type: String,
        enum: ['included', 'metered', 'shared'],
        default: 'metered'
      }
    },

    emergencyContacts: [{
      name: { type: String, required: true },
      phone: { type: String, required: true },
      role: { type: String, required: true }
    }],

    geoCoords: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  },
  { timestamps: true }
)

// Indexing for quick filtering
PropertySchema.index({ landlordId: 1 });
PropertySchema.index({ 'address.city': 1 });
PropertySchema.index({ status: 1 });
PropertySchema.index({ 'geoCoords.latitude': 1, 'geoCoords.longitude': 1 });

export const Property = mongoose.model<IProperty>('Property', PropertySchema);

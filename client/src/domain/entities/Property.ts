export type PropertyStatus = 'Active' | 'Inactive' | 'Maintenance' | 'Archived';
export type PropertyType = 'Boarding House' | 'Apartment' | 'Studio' | 'Dormitory' | 'Commercial' | 'Parking' | 'Land' | 'Mixed Use';

import type { AccommodationType } from './Unit';

export interface Venue {
  name: string;
  walking: string;
  commute: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  role: string;
}

export interface BillingSettings {
  billingDay: number;
  dueDay: number;
  lateFeePercent: number;
  utilityDefault: number;
}

export interface Property {
  id: string; // From UI models
  _id?: string; // From Mongoose
  landlordId: string;
  name: string;
  description: string;
  propertyType: PropertyType;
  status: PropertyStatus;
  images: string[];

  address: {
    street: string;
    city: string;
    province: string;
    zipCode: string;
    country: string;
  };

  inclusions: string[];

  reviewCenters: Venue[];
  schools: Venue[];
  commercialEstablishments: Venue[];

  geoCoords?: {
    lat: number;
    lng: number;
  };

  billingSettings?: BillingSettings;
  emergencyContacts?: EmergencyContact[];

  metrics: {
    totalUnits: number;
    activeUnits: number;
    vacantUnits: number;
    priceRange: {
      min: number;
      max: number;
    };
    accommodationTypes?: AccommodationType[];
  };

  createdAt: string | Date;
  updatedAt: string | Date;
}

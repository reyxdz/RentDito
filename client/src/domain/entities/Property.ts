export type PropertyStatus = 'Active' | 'Disabled' | 'Maintenance' | 'Archived';
export type PropertyType = 'Boarding House' | 'Apartment' | 'Commercial' | 'Parking' | 'Land' | 'Mixed Use';

export interface Property {
  id: string;
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
  otherDetails: string[];

  // Aggregated metadata mapped specifically for the dashboard stats
  metrics: {
    totalUnits: number;
    activeUnits: number;
    vacantUnits: number;
    priceRange: {
      min: number;
      max: number;
    };
  };

  createdAt: Date;
  updatedAt: Date;
}

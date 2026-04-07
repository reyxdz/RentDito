export type PropertyStatus = 'Active' | 'Disabled' | 'Maintenance' | 'Archived';
export type PropertyType = 'Boarding House' | 'Apartment' | 'Commercial' | 'Parking' | 'Land' | 'Mixed Use';
export type PropertyCategory = 'Review Centers' | 'Schools and Universities' | 'Commercial Establishments';

export interface NearbyCategory {
  category: PropertyCategory;
  distance?: string;
  name?: string;
}

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
    state: string;
    zipCode: string;
    country: string;
  };

  inclusions: string[];
  otherDetails: string[];
  nearbyCategories: NearbyCategory[];

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

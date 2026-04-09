export type PropertyStatus = 'Active' | 'Disabled' | 'Maintenance' | 'Archived';
export type PropertyType = 'Boarding House' | 'Apartment' | 'Commercial' | 'Parking' | 'Land' | 'Mixed Use';

export interface Venue {
  name: string;
  walking: string;
  commute: string;
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
  
  // Categorized venues with transportation times
  reviewCenters: Venue[];
  schools: Venue[];
  commercialEstablishments: Venue[];

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

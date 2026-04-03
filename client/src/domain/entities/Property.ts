export type PropertyStatus = 'Active' | 'Disabled' | 'Maintenance' | 'Archived';
export type PropertyType = 'Boarding House' | 'Apartment' | 'Commercial' | 'Parking' | 'Land' | 'Mixed Use';

export interface Property {
  id: string;
  landlordId: string;
  name: string;
  description: string;
  propertyType: PropertyType;
  status: PropertyStatus;
  
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  // Aggregated metadata mapped specifically for the dashboard stats
  metrics: {
    totalUnits: number;
    activeUnits: number;
    vacantUnits: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

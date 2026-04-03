import type { Property } from '../entities/Property';

export interface PropertyRepository {
  getPropertiesByLandlord(landlordId: string): Promise<Property[]>;
  getPropertyById(propertyId: string): Promise<Property | null>;
  createProperty(property: Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'metrics'>): Promise<Property>;
  updateProperty(propertyId: string, updates: Partial<Property>): Promise<Property>;
  deleteProperty(propertyId: string): Promise<void>;
}

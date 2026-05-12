import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import type { Property } from '../../domain/entities/Property';
import type { PropertyRepository } from '../../domain/repositories/PropertyRepository';

/** Map MongoDB _id to client-side id */
const mapProperty = (p: any): Property => ({
  ...p,
  id: p._id || p.id,
});

export class PropertyService implements PropertyRepository {
  async getPropertiesByLandlord(landlordId: string): Promise<Property[]> {
    const { data } = await apiClient.get(ENDPOINTS.PROPERTIES.ROOT, {
      params: { landlordId }
    });
    const raw = data.data || data;
    return raw.map(mapProperty);
  }

  async getPropertyById(propertyId: string): Promise<Property | null> {
    if (!propertyId || propertyId === 'undefined') return null;
    try {
      const { data } = await apiClient.get(ENDPOINTS.PROPERTIES.DETAILS(propertyId));
      return mapProperty(data.data || data);
    } catch (error: any) {
      if (error.statusCode === 404) return null;
      throw error;
    }
  }

  async createProperty(propertyParams: Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'metrics'>): Promise<Property> {
    const { data } = await apiClient.post(ENDPOINTS.PROPERTIES.ROOT, propertyParams);
    return mapProperty(data.data || data);
  }

  async updateProperty(propertyId: string, updates: Partial<Property>): Promise<Property> {
    if (!propertyId || propertyId === 'undefined') {
      throw new Error('Invalid property ID');
    }
    const { data } = await apiClient.patch(ENDPOINTS.PROPERTIES.DETAILS(propertyId), updates);
    return mapProperty(data.data || data);
  }

  async deleteProperty(propertyId: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.PROPERTIES.DETAILS(propertyId));
  }
}

export const propertyService = new PropertyService();

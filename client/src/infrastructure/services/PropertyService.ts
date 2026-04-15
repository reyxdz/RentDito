import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import type { Property } from '../../domain/entities/Property';
import type { PropertyRepository } from '../../domain/repositories/PropertyRepository';

export class PropertyService implements PropertyRepository {
  async getPropertiesByLandlord(landlordId: string): Promise<Property[]> {
    // Assuming backend takes landlordId as a query param or implicitly filtering via the auth token
    // The requirement says: filtering by landlordId for landlord. We pass it as query to be safe,
    // though typically the backend extracts it from the JWT.
    const { data } = await apiClient.get(ENDPOINTS.PROPERTIES.ROOT, {
      params: { landlordId }
    });
    return data.data || data; // Handle possible wrapper
  }

  async getPropertyById(propertyId: string): Promise<Property | null> {
    try {
      const { data } = await apiClient.get(ENDPOINTS.PROPERTIES.DETAILS(propertyId));
      return data.data || data;
    } catch (error: any) {
      if (error.statusCode === 404) return null;
      throw error;
    }
  }

  async createProperty(propertyParams: Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'metrics'>): Promise<Property> {
    const { data } = await apiClient.post(ENDPOINTS.PROPERTIES.ROOT, propertyParams);
    return data.data || data;
  }

  async updateProperty(propertyId: string, updates: Partial<Property>): Promise<Property> {
    const { data } = await apiClient.patch(ENDPOINTS.PROPERTIES.DETAILS(propertyId), updates);
    return data.data || data;
  }

  async deleteProperty(propertyId: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.PROPERTIES.DETAILS(propertyId));
  }
}

export const propertyService = new PropertyService();

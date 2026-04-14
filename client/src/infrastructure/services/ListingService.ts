import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import type { Property } from '../../domain/entities/Property';
import type { Unit } from '../../domain/entities/Unit';

export interface ListingPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PublicListingsResponse {
  properties: Property[];
  pagination: ListingPagination;
}

export interface PublicPropertyResponse extends Property {
  units: Unit[];
}

export class ListingService {
  /**
   * Fetch all active properties with optional filters
   */
  async getPublicListings(filters: Record<string, any> = {}): Promise<PublicListingsResponse> {
    const { data } = await apiClient.get(ENDPOINTS.PUBLIC.LISTINGS, {
      params: filters,
    });
    
    // The backend returns { status: 'success', data: [...], pagination: {...} }
    return {
      properties: (data.data || []).map((p: any) => ({ ...p, id: p._id || p.id })),
      pagination: data.pagination || { page: 1, limit: 20, total: 0, pages: 0 },
    };
  }

  /**
   * Fetch a single property and its active units
   */
  async getPublicPropertyById(propertyId: string): Promise<PublicPropertyResponse | null> {
    try {
      const { data } = await apiClient.get(ENDPOINTS.PUBLIC.PROPERTY_DETAILS(propertyId));
      const propData = data.data;
      if (!propData) return null;
      if (propData._id && !propData.id) propData.id = propData._id;
      if (propData.units) {
        propData.units = propData.units.map((u: any) => ({ ...u, id: u._id || u.id }));
      }
      return propData;
    } catch (error: any) {
      if (error.statusCode === 404 || error.response?.status === 404) return null;
      throw error;
    }
  }

  /**
   * Fetch a single unit and its associated property data
   */
  async getPublicUnitById(unitId: string): Promise<Unit | null> {
    try {
      const { data } = await apiClient.get(ENDPOINTS.PUBLIC.UNIT_DETAILS(unitId));
      const unitData = data.data;
      if (!unitData) return null;
      if (unitData._id && !unitData.id) unitData.id = unitData._id;
      return unitData;
    } catch (error: any) {
      if (error.statusCode === 404 || error.response?.status === 404) return null;
      throw error;
    }
  }
}

export const listingService = new ListingService();

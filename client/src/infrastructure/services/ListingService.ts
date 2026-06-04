import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import { mapMongoId } from '../utils/mapMongoId';
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

const mapBackendPropertyToClient = (p: any): Property => {
  const venues = p.venues || {};
  
  const mapVenues = (venueList: any[] = []) => 
    venueList.map(v => ({ 
      name: v.name || '', 
      walking: v.distance || '', 
      commute: '' 
    }));

  return {
    ...mapMongoId(p),
    address: {
      ...p.address,
      province: p.address?.province || p.address?.state || '',
    },
    reviewCenters: p.reviewCenters || mapVenues(venues.reviewCenters),
    schools: p.schools || mapVenues(venues.schools),
    commercialEstablishments: p.commercialEstablishments || mapVenues(venues.commercial),
    metrics: {
      ...(p.metrics || {}),
      priceRange: p.priceRange || { min: 0, max: 0 },
      totalUnits: p.metrics?.totalUnits || p.totalUnits || 0,
      activeUnits: p.metrics?.activeUnits || p.occupiedUnits || 0,
      vacantUnits: p.metrics?.vacantUnits || p.vacantUnits || 0,
    }
  };
};

export class ListingService {
  /**
   * Fetch all active properties with optional filters
   */
  async getPublicListings(filters: Record<string, any> = {}): Promise<PublicListingsResponse> {
    const { data } = await apiClient.get(ENDPOINTS.PUBLIC.LISTINGS, {
      params: filters,
    });
    
    return {
      properties: (data.data || []).map(mapBackendPropertyToClient),
      pagination: data.pagination || { page: 1, limit: 20, total: 0, pages: 0 },
    };
  }

  /**
   * Fetch a single property and its active units
   */
  async getPublicPropertyById(propertyId: string): Promise<PublicPropertyResponse | null> {
    try {
      const { data } = await apiClient.get(ENDPOINTS.PUBLIC.PROPERTY_DETAILS(propertyId));
      let propData = data.data;
      if (!propData) return null;
      
      const mappedProp = mapBackendPropertyToClient(propData);
      
      if (propData.units) {
        (mappedProp as any).units = propData.units.map((u: any) => mapMongoId<Unit>(u));
      }
      
      return mappedProp as PublicPropertyResponse;
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

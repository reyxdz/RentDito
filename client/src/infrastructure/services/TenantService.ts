import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import type { Tenancy } from '../../domain/entities/Tenancy';

export class TenantService {
  async getTenancies(filters?: Record<string, any>): Promise<Tenancy[]> {
    const { data } = await apiClient.get(ENDPOINTS.TENANCIES.ROOT, { params: filters });
    return data.data || data;
  }

  async getTenancyById(id: string): Promise<Tenancy> {
    const { data } = await apiClient.get(ENDPOINTS.TENANCIES.DETAILS(id));
    return data.data || data;
  }

  async confirmCheckIn(contractId: string, slotNumber?: number): Promise<Tenancy> {
    const { data } = await apiClient.post(ENDPOINTS.TENANCIES.CONFIRM_CHECKIN, {
      contractId,
      slotNumber,
    });
    return data.data || data;
  }

  async checkout(id: string): Promise<Tenancy> {
    const { data } = await apiClient.patch(ENDPOINTS.TENANCIES.CHECKOUT(id));
    return data.data || data;
  }

  async getMyTenancies(): Promise<Tenancy[]> {
    const { data } = await apiClient.get(ENDPOINTS.TENANCIES.MY);
    return data.data || data;
  }

  async getComments(id: string): Promise<any[]> {
    const { data } = await apiClient.get(ENDPOINTS.TENANCIES.COMMENTS(id));
    return data.data || data;
  }

  async addComment(id: string, text: string): Promise<any> {
    const { data } = await apiClient.post(ENDPOINTS.TENANCIES.COMMENTS(id), { text });
    return data.data || data;
  }

  async getRoommates(id: string): Promise<any[]> {
    const { data } = await apiClient.get(ENDPOINTS.TENANCIES.ROOMMATES(id));
    return data.data || data;
  }
}

export const tenantService = new TenantService();

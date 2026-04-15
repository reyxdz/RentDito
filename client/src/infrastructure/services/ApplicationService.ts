import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import type { RentalApplication } from '../../domain/entities/RentalApplication';
import type { ApplicationRepository } from '../../domain/repositories/ApplicationRepository';

export class ApplicationService implements ApplicationRepository {
  async getApplications(filters?: { status?: string; propertyId?: string }): Promise<RentalApplication[]> {
    const { data } = await apiClient.get(ENDPOINTS.APPLICATIONS.ROOT, { params: filters });
    return data.data || data;
  }

  async getApplicationById(applicationId: string): Promise<RentalApplication | null> {
    try {
      const { data } = await apiClient.get(ENDPOINTS.APPLICATIONS.DETAILS(applicationId));
      return data.data || data;
    } catch (error: any) {
      if (error.statusCode === 404) return null;
      throw error;
    }
  }

  async reviewApplication(applicationId: string, reviewNotes?: string): Promise<RentalApplication> {
    const { data } = await apiClient.patch(ENDPOINTS.APPLICATIONS.REVIEW(applicationId), { reviewNotes });
    return data.data || data;
  }

  async approveApplication(applicationId: string, reviewNotes?: string): Promise<RentalApplication> {
    const { data } = await apiClient.patch(ENDPOINTS.APPLICATIONS.APPROVE(applicationId), { reviewNotes });
    return data.data || data;
  }

  async rejectApplication(applicationId: string, reviewNotes: string): Promise<RentalApplication> {
    const { data } = await apiClient.patch(ENDPOINTS.APPLICATIONS.REJECT(applicationId), { reviewNotes });
    return data.data || data;
  }
}

export const applicationService = new ApplicationService();

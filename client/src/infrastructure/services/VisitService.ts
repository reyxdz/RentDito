import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import type { VisitRequest } from '../../domain/entities/VisitRequest';
import type { VisitRepository } from '../../domain/repositories/VisitRepository';

export class VisitService implements VisitRepository {
  async getPropertyVisits(propertyId: string, filters?: { status?: string }): Promise<VisitRequest[]> {
    const { data } = await apiClient.get(ENDPOINTS.VISITS.PROPERTY(propertyId), {
      params: filters,
    });
    return data.data || data;
  }

  async getVisitById(visitId: string): Promise<VisitRequest | null> {
    try {
      const { data } = await apiClient.get(ENDPOINTS.VISITS.DETAILS(visitId));
      return data.data || data;
    } catch (error: any) {
      if (error.statusCode === 404) return null;
      throw error;
    }
  }

  async approveVisit(visitId: string): Promise<VisitRequest> {
    const { data } = await apiClient.patch(ENDPOINTS.VISITS.APPROVE(visitId));
    return data.data || data;
  }

  async scheduleVisit(visitId: string, scheduleData: { scheduledDate: string; scheduledTime: string }): Promise<VisitRequest> {
    const { data } = await apiClient.patch(ENDPOINTS.VISITS.SCHEDULE(visitId), scheduleData);
    return data.data || data;
  }

  async assignStaff(visitId: string, staffId: string): Promise<VisitRequest> {
    const { data } = await apiClient.patch(ENDPOINTS.VISITS.ASSIGN(visitId), { staffId });
    return data.data || data;
  }

  async completeVisit(visitId: string): Promise<VisitRequest> {
    const { data } = await apiClient.patch(ENDPOINTS.VISITS.COMPLETE(visitId));
    return data.data || data;
  }

  async cancelVisit(visitId: string): Promise<VisitRequest> {
    const { data } = await apiClient.patch(ENDPOINTS.VISITS.CANCEL(visitId));
    return data.data || data;
  }

  async markNoShow(visitId: string): Promise<VisitRequest> {
    const { data } = await apiClient.patch(ENDPOINTS.VISITS.NO_SHOW(visitId));
    return data.data || data;
  }

  async updateNotes(visitId: string, notes: string): Promise<VisitRequest> {
    const { data } = await apiClient.patch(ENDPOINTS.VISITS.DETAILS(visitId), { notes });
    return data.data || data;
  }
}

export const visitService = new VisitService();

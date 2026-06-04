import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import type { IncidentReport, EmergencyContact } from '../../domain/entities/IncidentReport';
import type { SecurityRepository, IncidentQueryFilters } from '../../domain/repositories/SecurityRepository';

export class SecurityService implements SecurityRepository {
  async getIncidentReports(filters?: IncidentQueryFilters): Promise<IncidentReport[]> {
    const response = await apiClient.get<{ status: string; data: IncidentReport[] }>(
      ENDPOINTS.SECURITY.INCIDENTS,
      { params: filters }
    );
    return response.data.data;
  }

  async getIncidentReportById(id: string): Promise<IncidentReport | null> {
    const response = await apiClient.get<{ status: string; data: IncidentReport }>(
      ENDPOINTS.SECURITY.INCIDENT_DETAILS(id)
    );
    return response.data.data;
  }

  async createIncidentReport(data: Partial<IncidentReport>): Promise<IncidentReport> {
    const response = await apiClient.post<{ status: string; data: IncidentReport }>(
      ENDPOINTS.SECURITY.INCIDENTS,
      data
    );
    return response.data.data;
  }

  async updateIncidentReport(id: string, updates: Partial<IncidentReport>): Promise<IncidentReport> {
    const response = await apiClient.patch<{ status: string; data: IncidentReport }>(
      ENDPOINTS.SECURITY.INCIDENT_DETAILS(id),
      updates
    );
    return response.data.data;
  }

  async deleteIncidentReport(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.SECURITY.INCIDENT_DETAILS(id));
  }

  async getEmergencyContacts(propertyId: string): Promise<EmergencyContact[]> {
    const response = await apiClient.get<{ status: string; data: EmergencyContact[] }>(
      ENDPOINTS.SECURITY.CONTACTS(propertyId)
    );
    return response.data.data;
  }

  async updateEmergencyContacts(propertyId: string, contacts: EmergencyContact[]): Promise<EmergencyContact[]> {
    const response = await apiClient.put<{ status: string; data: EmergencyContact[] }>(
      ENDPOINTS.SECURITY.CONTACTS(propertyId),
      { contacts }
    );
    return response.data.data;
  }
}

export const securityService = new SecurityService();

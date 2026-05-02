import type { IncidentReport, EmergencyContact } from '../entities/IncidentReport';

export interface IncidentQueryFilters {
  propertyId?: string;
  status?: string;
  severity?: string;
  type?: string;
}

export interface SecurityRepository {
  getIncidentReports(filters?: IncidentQueryFilters): Promise<IncidentReport[]>;
  getIncidentReportById(id: string): Promise<IncidentReport | null>;
  createIncidentReport(data: Partial<IncidentReport>): Promise<IncidentReport>;
  updateIncidentReport(id: string, updates: Partial<IncidentReport>): Promise<IncidentReport>;
  deleteIncidentReport(id: string): Promise<void>;
  
  getEmergencyContacts(propertyId: string): Promise<EmergencyContact[]>;
  updateEmergencyContacts(propertyId: string, contacts: EmergencyContact[]): Promise<EmergencyContact[]>;
}

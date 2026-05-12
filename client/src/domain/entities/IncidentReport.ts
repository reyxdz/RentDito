export type IncidentType = 'theft' | 'damage' | 'medical' | 'fire' | 'dispute' | 'other';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export interface IncidentReport {
  id: string;
  propertyId: string;
  property?: { name: string };
  reportedBy: string;
  reportedByUser?: { name: string; email: string };
  dateOfIncident: string | Date;
  type: IncidentType;
  severity: IncidentSeverity;
  description: string;
  status: IncidentStatus;
  resolutionNotes?: string;
  attachments: string[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface EmergencyContact {
  id?: string;
  name: string;
  phone: string;
  role: string;
}

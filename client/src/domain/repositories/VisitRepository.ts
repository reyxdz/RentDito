import type { VisitRequest } from '../entities/VisitRequest';

export interface VisitRepository {
  getPropertyVisits(propertyId: string, filters?: { status?: string }): Promise<VisitRequest[]>;
  getVisitById(visitId: string): Promise<VisitRequest | null>;
  approveVisit(visitId: string): Promise<VisitRequest>;
  scheduleVisit(visitId: string, data: { scheduledDate: string; scheduledTime: string }): Promise<VisitRequest>;
  assignStaff(visitId: string, staffId: string): Promise<VisitRequest>;
  completeVisit(visitId: string): Promise<VisitRequest>;
  cancelVisit(visitId: string): Promise<VisitRequest>;
  markNoShow(visitId: string): Promise<VisitRequest>;
  updateNotes(visitId: string, notes: string): Promise<VisitRequest>;
}

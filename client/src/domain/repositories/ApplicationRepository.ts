import type { RentalApplication, ApplicationStatus } from '../entities/RentalApplication';

export interface ApplicationRepository {
  getApplications(filters?: { status?: string; propertyId?: string }): Promise<RentalApplication[]>;
  getApplicationById(applicationId: string): Promise<RentalApplication | null>;
  reviewApplication(applicationId: string, reviewNotes?: string): Promise<RentalApplication>;
  approveApplication(applicationId: string, reviewNotes?: string): Promise<RentalApplication>;
  rejectApplication(applicationId: string, reviewNotes: string): Promise<RentalApplication>;
}

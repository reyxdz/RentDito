import { useState, useCallback } from 'react';
import { MockApplicationService } from '../../infrastructure/services/MockApplicationService';
import type { RentalApplication } from '../../infrastructure/services/MockApplicationService';

export function useApplications(userId?: string) {
  const [applications, setApplications] = useState<RentalApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (userId) {
        const data = await MockApplicationService.getApplicationsByUser(userId);
        setApplications(data);
      } else {
        // Landlord mode: get all applications
        const data = await MockApplicationService.getApplicationsByUser('usr_tenant');
        setApplications(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createApplication = async (data: {
    propertyId: string;
    propertyName: string;
    unitId: string;
    unitIdentifier: string;
    userId: string;
    userName: string;
    personalDetails: RentalApplication['personalDetails'];
    documents: string[];
  }) => {
    setLoading(true);
    try {
      const newApp = await MockApplicationService.createApplication(data);
      setApplications((prev) => [newApp, ...prev]);
      return newApp;
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const withdrawApplication = async (applicationId: string) => {
    setLoading(true);
    try {
      const updated = await MockApplicationService.withdrawApplication(applicationId);
      setApplications((prev) => prev.map((a) => (a.id === applicationId ? updated : a)));
      return updated;
    } catch (err: any) {
      setError(err.message || 'Failed to withdraw application');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { applications, loading, error, fetchApplications, createApplication, withdrawApplication };
}

export function useApplicationDetail(applicationId?: string) {
  const [application, setApplication] = useState<RentalApplication | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplication = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await MockApplicationService.getApplicationById(applicationId);
      if (!data) throw new Error('Application not found');
      setApplication(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch application');
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  const review = async (_notes?: string) => {
    if (!application) return;
    // Mock: just change status to under_review
    setApplication({ ...application, status: 'under_review', reviewNotes: _notes, updatedAt: new Date().toISOString() });
  };

  const approve = async (notes?: string) => {
    if (!application) return;
    setApplication({ ...application, status: 'approved', reviewNotes: notes, reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  };

  const reject = async (notes?: string) => {
    if (!application) return;
    setApplication({ ...application, status: 'rejected', reviewNotes: notes, reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  };

  return { application, loading, error, fetchApplication, review, approve, reject };
}

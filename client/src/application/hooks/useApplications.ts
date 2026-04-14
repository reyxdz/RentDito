import { useState, useCallback } from 'react';
import type { RentalApplication } from '../../domain/entities/RentalApplication';
import { applicationService } from '../../infrastructure/services/ApplicationService';

export function useApplications() {
  const [applications, setApplications] = useState<RentalApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async (filters?: { status?: string; propertyId?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await applicationService.getApplications(filters);
      setApplications(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch applications');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const reviewApplication = useCallback(async (appId: string, reviewNotes?: string) => {
    try {
      const updated = await applicationService.reviewApplication(appId, reviewNotes);
      setApplications(prev => prev.map(a => ((a as any)._id || a.id) === appId ? { ...a, ...updated, id: a.id } : a));
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to review application');
    }
  }, []);

  const approveApplication = useCallback(async (appId: string, reviewNotes?: string) => {
    try {
      const updated = await applicationService.approveApplication(appId, reviewNotes);
      setApplications(prev => prev.map(a => ((a as any)._id || a.id) === appId ? { ...a, ...updated, id: a.id } : a));
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to approve application');
    }
  }, []);

  const rejectApplication = useCallback(async (appId: string, reviewNotes: string) => {
    try {
      const updated = await applicationService.rejectApplication(appId, reviewNotes);
      setApplications(prev => prev.map(a => ((a as any)._id || a.id) === appId ? { ...a, ...updated, id: a.id } : a));
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to reject application');
    }
  }, []);

  return {
    applications,
    loading,
    error,
    fetchApplications,
    reviewApplication,
    approveApplication,
    rejectApplication,
  };
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
      const data = await applicationService.getApplicationById(applicationId);
      setApplication(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch application');
      return null;
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  const review = useCallback(async (reviewNotes?: string) => {
    if (!applicationId) return;
    try {
      const updated = await applicationService.reviewApplication(applicationId, reviewNotes);
      setApplication(prev => prev ? { ...prev, ...updated } : updated);
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to review');
    }
  }, [applicationId]);

  const approve = useCallback(async (reviewNotes?: string) => {
    if (!applicationId) return;
    try {
      const updated = await applicationService.approveApplication(applicationId, reviewNotes);
      setApplication(prev => prev ? { ...prev, ...updated } : updated);
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to approve');
    }
  }, [applicationId]);

  const reject = useCallback(async (reviewNotes: string) => {
    if (!applicationId) return;
    try {
      const updated = await applicationService.rejectApplication(applicationId, reviewNotes);
      setApplication(prev => prev ? { ...prev, ...updated } : updated);
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to reject');
    }
  }, [applicationId]);

  return {
    application,
    loading,
    error,
    fetchApplication,
    review,
    approve,
    reject,
  };
}

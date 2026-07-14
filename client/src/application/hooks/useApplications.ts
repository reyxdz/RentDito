import { useState, useCallback } from 'react';
import { apiClient } from '../../infrastructure/api/apiClient';
import { ENDPOINTS } from '../../infrastructure/api/endpoints';
import type { RentalApplication } from '../../domain/entities/RentalApplication';

export function useApplications(userId?: string) {
  const [applications, setApplications] = useState<RentalApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get(ENDPOINTS.APPLICATIONS.ROOT);
      setApplications(data.data || data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createApplication = async (applicationData: {
    propertyId: string;
    unitId: string;
    personalDetails: RentalApplication['personalDetails'];
    documents: string[];
  }) => {
    setLoading(true);
    try {
      const { data } = await apiClient.post(ENDPOINTS.APPLICATIONS.ROOT, applicationData);
      const newApp = data.data || data;
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
      const { data } = await apiClient.patch(ENDPOINTS.APPLICATIONS.REJECT(applicationId), { reviewNotes: 'Withdrawn by applicant' });
      const updated = data.data || data;
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
      const { data } = await apiClient.get(ENDPOINTS.APPLICATIONS.DETAILS(applicationId));
      setApplication(data.data || data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch application');
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  const review = async (notes?: string) => {
    if (!application) return;
    try {
      const { data } = await apiClient.patch(ENDPOINTS.APPLICATIONS.REVIEW(application.id), { reviewNotes: notes });
      setApplication(data.data || data);
    } catch (err: any) {
      setError(err.message || 'Failed to review application');
    }
  };

  const approve = async (notes?: string) => {
    if (!application) return;
    try {
      const { data } = await apiClient.patch(ENDPOINTS.APPLICATIONS.APPROVE(application.id), { reviewNotes: notes });
      setApplication(data.data || data);
    } catch (err: any) {
      setError(err.message || 'Failed to approve application');
    }
  };

  const reject = async (notes?: string) => {
    if (!application) return;
    try {
      const { data } = await apiClient.patch(ENDPOINTS.APPLICATIONS.REJECT(application.id), { reviewNotes: notes });
      setApplication(data.data || data);
    } catch (err: any) {
      setError(err.message || 'Failed to reject application');
    }
  };

  return { application, loading, error, fetchApplication, review, approve, reject };
}

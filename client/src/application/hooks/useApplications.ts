import { useState, useCallback } from 'react';
import { MockApplicationService } from '../../infrastructure/services/MockApplicationService';
import type { RentalApplication } from '../../infrastructure/services/MockApplicationService';

export function useApplications(userId?: string) {
  const [applications, setApplications] = useState<RentalApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await MockApplicationService.getApplicationsByUser(userId);
      setApplications(data);
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

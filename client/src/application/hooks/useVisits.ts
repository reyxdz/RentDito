import { useState, useCallback } from 'react';
import { apiClient } from '../../infrastructure/api/apiClient';
import { ENDPOINTS } from '../../infrastructure/api/endpoints';
import type { VisitRequest } from '../../domain/entities/VisitRequest';

/** Time slot shape used by the TimeSlotPicker component */
export interface TimeSlot {
  time: string;
  available: boolean;
}

export function useVisits(userId?: string) {
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get(ENDPOINTS.VISITS.ROOT);
      setVisits(data.data || data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch visits');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createVisit = async (visitData: {
    propertyId: string;
    unitId?: string;
    requestedDate: string;
    requestedTime: string;
    purpose: 'viewing' | 'inspection';
    notes?: string;
  }) => {
    setLoading(true);
    try {
      const { data } = await apiClient.post(ENDPOINTS.VISITS.ROOT, visitData);
      const newVisit = data.data || data;
      setVisits((prev) => [newVisit, ...prev]);
      return newVisit;
    } catch (err: any) {
      setError(err.message || 'Failed to create visit');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelVisit = async (visitId: string) => {
    setLoading(true);
    try {
      const { data } = await apiClient.patch(ENDPOINTS.VISITS.CANCEL(visitId));
      const updated = data.data || data;
      setVisits((prev) => prev.map((v) => (v.id === visitId ? updated : v)));
      return updated;
    } catch (err: any) {
      setError(err.message || 'Failed to cancel visit');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { visits, loading, error, fetchVisits, createVisit, cancelVisit };
}

export function useVisitDetail(visitId?: string) {
  const [visit, setVisit] = useState<VisitRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVisit = useCallback(async () => {
    if (!visitId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get(ENDPOINTS.VISITS.DETAILS(visitId));
      const result = data.data || data;
      if (!result) throw new Error('Visit not found');
      setVisit(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch visit');
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  const approve = async () => {
    if (!visit) return;
    const { data } = await apiClient.patch(ENDPOINTS.VISITS.APPROVE(visit.id));
    setVisit(data.data || data);
  };

  const schedule = async (scheduleData: { scheduledDate: string; scheduledTime: string }) => {
    if (!visit) return;
    const { data } = await apiClient.patch(ENDPOINTS.VISITS.SCHEDULE(visit.id), scheduleData);
    setVisit(data.data || data);
  };

  const assign = async (staffId: string) => {
    if (!visit) return;
    const { data } = await apiClient.patch(ENDPOINTS.VISITS.ASSIGN(visit.id), { staffId });
    setVisit(data.data || data);
  };

  const complete = async () => {
    if (!visit) return;
    const { data } = await apiClient.patch(ENDPOINTS.VISITS.COMPLETE(visit.id));
    setVisit(data.data || data);
  };

  const cancel = async () => {
    if (!visit) return;
    const { data } = await apiClient.patch(ENDPOINTS.VISITS.CANCEL(visit.id));
    setVisit(data.data || data);
  };

  const noShow = async () => {
    if (!visit) return;
    const { data } = await apiClient.patch(ENDPOINTS.VISITS.NO_SHOW(visit.id));
    setVisit(data.data || data);
  };

  const updateNotes = async (notes: string) => {
    if (!visit) return;
    const { data } = await apiClient.patch(ENDPOINTS.VISITS.DETAILS(visit.id), { notes });
    setVisit(data.data || data);
  };

  return { visit, loading, error, fetchVisit, approve, schedule, assign, complete, cancel, noShow, updateNotes };
}

export function useTimeSlots() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSlots = useCallback(async (_unitId: string, _date: string) => {
    // Time slots can be generated client-side or fetched from a future endpoint
    setLoading(true);
    try {
      const defaultSlots: TimeSlot[] = [
        '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
        '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
        '04:00 PM', '04:30 PM',
      ].map((time) => ({ time, available: true }));
      setSlots(defaultSlots);
    } finally {
      setLoading(false);
    }
  }, []);

  return { slots, loading, fetchSlots };
}

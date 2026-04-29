import { useState, useCallback } from 'react';
import { MockVisitService } from '../../infrastructure/services/MockVisitService';
import type { Visit, TimeSlot } from '../../infrastructure/services/MockVisitService';

export function useVisits(userId?: string) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (userId) {
        const data = await MockVisitService.getVisitsByUser(userId);
        setVisits(data);
      } else {
        // Landlord mode: get all visits
        const data = await MockVisitService.getVisitsByUser('usr_tenant');
        setVisits(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch visits');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createVisit = async (data: {
    propertyId: string;
    propertyName: string;
    unitId?: string;
    unitIdentifier?: string;
    userId: string;
    userName: string;
    preferredDate: string;
    preferredTime: string;
    purpose: 'viewing' | 'inspection';
    notes?: string;
  }) => {
    setLoading(true);
    try {
      const newVisit = await MockVisitService.createVisit(data);
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
      const updated = await MockVisitService.cancelVisit(visitId);
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
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVisit = useCallback(async () => {
    if (!visitId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await MockVisitService.getVisitById(visitId);
      if (!data) throw new Error('Visit not found');
      setVisit(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch visit');
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  const approve = async () => {
    if (!visit) return;
    setVisit({ ...visit, status: 'approved', updatedAt: new Date().toISOString() });
  };

  const schedule = async (data: { scheduledDate: string; scheduledTime: string }) => {
    if (!visit) return;
    setVisit({ ...visit, status: 'scheduled', scheduledDate: data.scheduledDate, scheduledTime: data.scheduledTime, updatedAt: new Date().toISOString() });
  };

  const assign = async (_staffId: string) => {
    if (!visit) return;
    setVisit({ ...visit, updatedAt: new Date().toISOString() });
  };

  const complete = async () => {
    if (!visit) return;
    setVisit({ ...visit, status: 'completed', updatedAt: new Date().toISOString() });
  };

  const cancel = async () => {
    if (!visit) return;
    setVisit({ ...visit, status: 'cancelled', updatedAt: new Date().toISOString() });
  };

  const noShow = async () => {
    if (!visit) return;
    setVisit({ ...visit, status: 'no_show', updatedAt: new Date().toISOString() });
  };

  const updateNotes = async (notes: string) => {
    if (!visit) return;
    setVisit({ ...visit, notes, updatedAt: new Date().toISOString() });
  };

  return { visit, loading, error, fetchVisit, approve, schedule, assign, complete, cancel, noShow, updateNotes };
}

export function useTimeSlots() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSlots = useCallback(async (unitId: string, date: string) => {
    if (!unitId || !date) return;
    setLoading(true);
    try {
      const data = await MockVisitService.getAvailableSlots(unitId, date);
      setSlots(data);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { slots, loading, fetchSlots };
}


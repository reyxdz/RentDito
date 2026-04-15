import { useState, useCallback } from 'react';
import { MockVisitService } from '../../infrastructure/services/MockVisitService';
import type { Visit, TimeSlot } from '../../infrastructure/services/MockVisitService';

export function useVisits(userId?: string) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVisits = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await MockVisitService.getVisitsByUser(userId);
      setVisits(data);
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

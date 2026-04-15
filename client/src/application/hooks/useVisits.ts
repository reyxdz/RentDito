import { useState, useCallback } from 'react';
import type { VisitRequest } from '../../domain/entities/VisitRequest';
import { visitService } from '../../infrastructure/services/VisitService';

export function useVisits() {
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPropertyVisits = useCallback(async (propertyId: string, filters?: { status?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await visitService.getPropertyVisits(propertyId, filters);
      setVisits(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch visits');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const approveVisit = useCallback(async (visitId: string) => {
    try {
      const updated = await visitService.approveVisit(visitId);
      setVisits(prev => prev.map(v => (v.id === visitId || (v as any)._id === visitId) ? { ...v, ...updated, id: v.id } : v));
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to approve visit');
    }
  }, []);

  const scheduleVisit = useCallback(async (visitId: string, data: { scheduledDate: string; scheduledTime: string }) => {
    try {
      const updated = await visitService.scheduleVisit(visitId, data);
      setVisits(prev => prev.map(v => (v.id === visitId || (v as any)._id === visitId) ? { ...v, ...updated, id: v.id } : v));
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to schedule visit');
    }
  }, []);

  const assignStaff = useCallback(async (visitId: string, staffId: string) => {
    try {
      const updated = await visitService.assignStaff(visitId, staffId);
      setVisits(prev => prev.map(v => (v.id === visitId || (v as any)._id === visitId) ? { ...v, ...updated, id: v.id } : v));
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to assign staff');
    }
  }, []);

  const completeVisit = useCallback(async (visitId: string) => {
    try {
      const updated = await visitService.completeVisit(visitId);
      setVisits(prev => prev.map(v => (v.id === visitId || (v as any)._id === visitId) ? { ...v, ...updated, id: v.id } : v));
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to complete visit');
    }
  }, []);

  const cancelVisit = useCallback(async (visitId: string) => {
    try {
      const updated = await visitService.cancelVisit(visitId);
      setVisits(prev => prev.map(v => (v.id === visitId || (v as any)._id === visitId) ? { ...v, ...updated, id: v.id } : v));
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to cancel visit');
    }
  }, []);

  const markNoShow = useCallback(async (visitId: string) => {
    try {
      const updated = await visitService.markNoShow(visitId);
      setVisits(prev => prev.map(v => (v.id === visitId || (v as any)._id === visitId) ? { ...v, ...updated, id: v.id } : v));
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to mark no-show');
    }
  }, []);

  return {
    visits,
    loading,
    error,
    fetchPropertyVisits,
    approveVisit,
    scheduleVisit,
    assignStaff,
    completeVisit,
    cancelVisit,
    markNoShow,
  };
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
      const data = await visitService.getVisitById(visitId);
      setVisit(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch visit');
      return null;
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  const approve = useCallback(async () => {
    if (!visitId) return;
    try {
      const updated = await visitService.approveVisit(visitId);
      setVisit(prev => prev ? { ...prev, ...updated } : updated);
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to approve visit');
    }
  }, [visitId]);

  const schedule = useCallback(async (data: { scheduledDate: string; scheduledTime: string }) => {
    if (!visitId) return;
    try {
      const updated = await visitService.scheduleVisit(visitId, data);
      setVisit(prev => prev ? { ...prev, ...updated } : updated);
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to schedule visit');
    }
  }, [visitId]);

  const assign = useCallback(async (staffId: string) => {
    if (!visitId) return;
    try {
      const updated = await visitService.assignStaff(visitId, staffId);
      setVisit(prev => prev ? { ...prev, ...updated } : updated);
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to assign staff');
    }
  }, [visitId]);

  const complete = useCallback(async () => {
    if (!visitId) return;
    try {
      const updated = await visitService.completeVisit(visitId);
      setVisit(prev => prev ? { ...prev, ...updated } : updated);
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to complete visit');
    }
  }, [visitId]);

  const cancel = useCallback(async () => {
    if (!visitId) return;
    try {
      const updated = await visitService.cancelVisit(visitId);
      setVisit(prev => prev ? { ...prev, ...updated } : updated);
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to cancel visit');
    }
  }, [visitId]);

  const noShow = useCallback(async () => {
    if (!visitId) return;
    try {
      const updated = await visitService.markNoShow(visitId);
      setVisit(prev => prev ? { ...prev, ...updated } : updated);
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to mark no-show');
    }
  }, [visitId]);

  const updateNotes = useCallback(async (notes: string) => {
    if (!visitId) return;
    try {
      const updated = await visitService.updateNotes(visitId, notes);
      setVisit(prev => prev ? { ...prev, ...updated } : updated);
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update notes');
    }
  }, [visitId]);

  return {
    visit,
    loading,
    error,
    fetchVisit,
    approve,
    schedule,
    assign,
    complete,
    cancel,
    noShow,
    updateNotes,
  };
}

import { useState, useCallback } from 'react';
import { tenantService } from '../../infrastructure/services/TenantService';
import type { Tenancy } from '../../domain/entities/Tenancy';

export function useTenants(initialFilters?: Record<string, any>) {
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenancies = useCallback(async (filters?: Record<string, any>) => {
    try {
      setLoading(true);
      setError(null);
      const data = await tenantService.getTenancies(filters || initialFilters);
      setTenancies(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to map tenancies');
    } finally {
      setLoading(false);
    }
  }, [initialFilters]);

  return { tenancies, loading, error, fetchTenancies };
}

export function useTenantDetail(tenancyId?: string) {
  const [tenancy, setTenancy] = useState<Tenancy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenancy = useCallback(async () => {
    if (!tenancyId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await tenantService.getTenancyById(tenancyId);
      setTenancy(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load tenancy detail');
    } finally {
      setLoading(false);
    }
  }, [tenancyId]);

  const confirmCheckIn = async (contractId: string, slotNumber?: number) => {
    try {
      const data = await tenantService.confirmCheckIn(contractId, slotNumber);
      return data;
    } catch (err: any) {
      throw err;
    }
  };

  const checkout = async () => {
    if (!tenancyId) return;
    try {
      const data = await tenantService.checkout(tenancyId);
      setTenancy(data);
      return data;
    } catch (err: any) {
      throw err;
    }
  };

  const getComments = async () => {
    if (!tenancyId) return [];
    return tenantService.getComments(tenancyId);
  };

  const addComment = async (text: string) => {
    if (!tenancyId) return;
    return tenantService.addComment(tenancyId, text);
  };

  const getRoommates = async () => {
    if (!tenancyId) return [];
    return tenantService.getRoommates(tenancyId);
  };

  return { tenancy, loading, error, fetchTenancy, confirmCheckIn, checkout, getComments, addComment, getRoommates };
}

export function useMyTenancies() {
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenancies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tenantService.getMyTenancies();
      setTenancies(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to map my tenancies');
    } finally {
      setLoading(false);
    }
  }, []);

  return { tenancies, loading, error, fetchTenancies };
}

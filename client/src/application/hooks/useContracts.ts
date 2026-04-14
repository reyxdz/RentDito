import { useState, useCallback } from 'react';
import type { Contract, ContractStatus } from '../../domain/entities/Contract';
import { contractService } from '../../infrastructure/services/ContractService';

export function useContracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = useCallback(async (filters?: { status?: string; propertyId?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await contractService.getContracts(filters);
      setContracts(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch contracts');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createFromApplication = useCallback(async (applicationId: string) => {
    try {
      const newContract = await contractService.createFromApplication(applicationId);
      setContracts(prev => [newContract, ...prev]);
      return newContract;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create contract');
    }
  }, []);

  return {
    contracts,
    loading,
    error,
    fetchContracts,
    createFromApplication,
  };
}

export function useContractDetail(contractId?: string) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContract = useCallback(async () => {
    if (!contractId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await contractService.getContractById(contractId);
      setContract(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch contract');
      return null;
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  const updateContract = useCallback(async (updates: Partial<Contract>) => {
    if (!contractId) return;
    try {
      const updated = await contractService.updateContract(contractId, updates);
      setContract(prev => prev ? { ...prev, ...updated } : updated);
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update contract');
    }
  }, [contractId]);

  const signContract = useCallback(async (signatureData: string, role: 'landlord' | 'user') => {
    if (!contractId) return;
    try {
      const updated = await contractService.signContract(contractId, signatureData, role);
      setContract(prev => prev ? { ...prev, ...updated } : updated);
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to sign contract');
    }
  }, [contractId]);

  const updateStatus = useCallback(async (status: ContractStatus) => {
    if (!contractId) return;
    try {
      const updated = await contractService.updateStatus(contractId, status);
      setContract(prev => prev ? { ...prev, ...updated } : updated);
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update status');
    }
  }, [contractId]);

  const generatePDF = useCallback(async () => {
    if (!contractId) return;
    try {
      const updated = await contractService.generatePDF(contractId);
      setContract(prev => prev ? { ...prev, ...updated } : updated);
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to generate PDF');
    }
  }, [contractId]);

  const downloadPDF = useCallback(async () => {
    if (!contractId) return;
    try {
      const url = await contractService.getDownloadUrl(contractId);
      window.open(url, '_blank');
      return url;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to download PDF');
    }
  }, [contractId]);

  return {
    contract,
    loading,
    error,
    fetchContract,
    updateContract,
    signContract,
    updateStatus,
    generatePDF,
    downloadPDF,
  };
}

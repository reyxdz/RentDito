import { useState, useCallback } from 'react';
import { MockContractService } from '../../infrastructure/services/MockContractService';
import type { Contract } from '../../domain/entities/Contract';

export function useUserContracts(userId: string) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await MockContractService.getUserContracts(userId);
      setContracts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch contracts');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  return { contracts, isLoading, error, fetchContracts };
}

export function useContractDetail(contractId: string | undefined) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContract = useCallback(async () => {
    if (!contractId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await MockContractService.getContractById(contractId);
      if (data) {
        setContract(data);
      } else {
        setError('Contract not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch contract details');
    } finally {
      setIsLoading(false);
    }
  }, [contractId]);

  return { contract, isLoading, error, fetchContract };
}

export function useSignContract() {
  const [isSigning, setIsSigning] = useState(false);
  const signContract = async (contractId: string, signatureData: string, onSuccess?: (contract: Contract) => void) => {
    setIsSigning(true);
    try {
      const updated = await MockContractService.signContract(contractId, signatureData);
      if (onSuccess) onSuccess(updated);
      return updated;
    } catch (error: any) {
      console.error(error.message || 'Failed to sign contract');
      throw error;
    } finally {
      setIsSigning(false);
    }
  };

  return { signContract, isSigning };
}

import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import type { Contract, ContractStatus } from '../../domain/entities/Contract';
import type { ContractRepository } from '../../domain/repositories/ContractRepository';

export class ContractService implements ContractRepository {
  async getContracts(filters?: { status?: string; propertyId?: string }): Promise<Contract[]> {
    const { data } = await apiClient.get(ENDPOINTS.CONTRACTS.ROOT, { params: filters });
    return data.data || data;
  }

  async getContractById(contractId: string): Promise<Contract | null> {
    try {
      const { data } = await apiClient.get(ENDPOINTS.CONTRACTS.DETAILS(contractId));
      return data.data || data;
    } catch (error: any) {
      if (error.statusCode === 404) return null;
      throw error;
    }
  }

  async createFromApplication(applicationId: string): Promise<Contract> {
    const { data } = await apiClient.post(ENDPOINTS.CONTRACTS.CREATE_FROM_APP, { applicationId });
    return data.data || data;
  }

  async updateContract(contractId: string, updates: Partial<Contract>): Promise<Contract> {
    const { data } = await apiClient.patch(ENDPOINTS.CONTRACTS.DETAILS(contractId), updates);
    return data.data || data;
  }

  async signContract(contractId: string, signatureData: string, role: 'landlord' | 'user'): Promise<Contract> {
    const { data } = await apiClient.post(ENDPOINTS.CONTRACTS.SIGN(contractId), { signatureData, role });
    return data.data || data;
  }

  async updateStatus(contractId: string, status: ContractStatus): Promise<Contract> {
    const { data } = await apiClient.patch(ENDPOINTS.CONTRACTS.STATUS(contractId), { status });
    return data.data || data;
  }

  async generatePDF(contractId: string): Promise<Contract> {
    const { data } = await apiClient.post(ENDPOINTS.CONTRACTS.GENERATE_PDF(contractId));
    return data.data || data;
  }

  async getDownloadUrl(contractId: string): Promise<string> {
    const { data } = await apiClient.get(ENDPOINTS.CONTRACTS.DOWNLOAD(contractId));
    return data.data?.url || data.url || data;
  }
}

export const contractService = new ContractService();

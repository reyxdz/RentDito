import type { Contract, ContractStatus } from '../entities/Contract';

export interface ContractRepository {
  getContracts(filters?: { status?: string; propertyId?: string }): Promise<Contract[]>;
  getContractById(contractId: string): Promise<Contract | null>;
  createFromApplication(applicationId: string): Promise<Contract>;
  updateContract(contractId: string, updates: Partial<Contract>): Promise<Contract>;
  signContract(contractId: string, signatureData: string, role: 'landlord' | 'user'): Promise<Contract>;
  updateStatus(contractId: string, status: ContractStatus): Promise<Contract>;
  generatePDF(contractId: string): Promise<Contract>;
  getDownloadUrl(contractId: string): Promise<string>;
}

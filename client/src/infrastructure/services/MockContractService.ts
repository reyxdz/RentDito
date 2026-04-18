import type { Contract } from '../../domain/entities/Contract';
import { mockApplications } from './MockApplicationService';

// Mock some contracts to use in the application
export let mockContracts: Contract[] = [
  {
    id: 'con_1',
    applicationId: 'app_1',
    application: mockApplications[0] as any,
    propertyId: mockApplications[0]?.propertyId || 'prop_1',
    unitId: mockApplications[0]?.unitId || 'unit_1',
    landlordId: 'll_1',
    userId: 'user_1',
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 2)).toISOString(),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 10)).toISOString(),
    lockInPeriod: 6,
    monthlyRent: 15000,
    securityDeposit: 30000,
    advancePayment: 15000,
    utilityIncludedInRent: false,
    rateType: 'fixed',
    terms: 'Standard 1 year lease terms applied. Tenant must observe noise curfew after 10 PM. Modification to the unit requires prior written approval.',
    landlordSignature: 'Landlord Signature Data',
    userSignature: undefined,
    status: 'pending_signature',
    createdAt: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
  },
  {
    id: 'con_2',
    applicationId: 'app_2',
    propertyId: 'prop_2',
    unitId: 'unit_2',
    landlordId: 'll_1',
    userId: 'user_1',
    startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString(),
    endDate: new Date().toISOString(),
    lockInPeriod: 12,
    monthlyRent: 12000,
    securityDeposit: 24000,
    advancePayment: 12000,
    utilityIncludedInRent: true,
    rateType: 'fixed',
    terms: 'Previous rental contract terms.',
    landlordSignature: 'Landlord Sig',
    userSignature: 'User Sig',
    signedAt: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString(),
    status: 'expired',
    documentUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', // Dummy PDF link
    createdAt: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString(),
    updatedAt: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString(),
  }
];

export const MockContractService = {
  getUserContracts: async (userId: string): Promise<Contract[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));
    return mockContracts.filter(c => c.userId === userId);
  },

  getContractById: async (contractId: string): Promise<Contract | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockContracts.find(c => c.id === contractId);
  },

  signContract: async (contractId: string, signatureData: string): Promise<Contract> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    let updatedContract: Contract | undefined;
    mockContracts = mockContracts.map(c => {
      if (c.id === contractId) {
        updatedContract = {
          ...c,
          userSignature: signatureData,
          status: 'active',
          signedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return updatedContract;
      }
      return c;
    });

    if (!updatedContract) {
      throw new Error('Contract not found');
    }

    return updatedContract;
  }
};

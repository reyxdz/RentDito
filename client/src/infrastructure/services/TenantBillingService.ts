import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import type { Bill } from '../../domain/entities/Bill';

export class TenantBillingService {
  /**
   * Get all bills for the current tenant user.
   */
  async getMyBills(): Promise<Bill[]> {
    const { data } = await apiClient.get(ENDPOINTS.BILLS.ROOT);
    return data.data || data;
  }

  /**
   * Get full details of a specific bill including breakdown and payments.
   */
  async getBillById(id: string): Promise<Bill | null> {
    try {
      const { data } = await apiClient.get(ENDPOINTS.BILLS.DETAILS(id));
      return data.data || data;
    } catch (error: any) {
      if (error.statusCode === 404 || error.response?.status === 404) return null;
      throw error;
    }
  }

  /**
   * Download the receipt PDF for a paid bill.
   */
  async downloadReceipt(id: string): Promise<void> {
    const response = await apiClient.get(`${ENDPOINTS.BILLS.DETAILS(id)}/receipt`, {
      responseType: 'blob',
    });

    // Create a temporary URL and trigger download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `receipt-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const tenantBillingService = new TenantBillingService();

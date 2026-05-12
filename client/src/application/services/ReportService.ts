import { apiClient } from '../../infrastructure/api/apiClient';
import type { OccupancyStats, CheckoutForecast } from '../../domain/models/Report';

export class ReportService {
  static async getOccupancyStats(): Promise<OccupancyStats> {
    const response = await apiClient.get('/api/reports/occupancy');
    return response.data.data;
  }

  static async getCheckoutForecast(): Promise<CheckoutForecast> {
    const response = await apiClient.get('/api/reports/checkout-forecast');
    return response.data.data;
  }
}

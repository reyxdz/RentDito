import axiosInstance from '../../infrastructure/api/axiosConfig';
import { OccupancyStats, CheckoutForecast } from '../../domain/models/Report';

export class ReportService {
  static async getOccupancyStats(): Promise<OccupancyStats> {
    const response = await axiosInstance.get('/reports/occupancy');
    return response.data.data;
  }

  static async getCheckoutForecast(): Promise<CheckoutForecast> {
    const response = await axiosInstance.get('/reports/checkout-forecast');
    return response.data.data;
  }
}

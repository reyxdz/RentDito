import { apiClient } from '../../infrastructure/api/apiClient';
import type { OccupancyStats, CheckoutForecast, VacancyForecast, ReservationForecast } from '../../domain/models/Report';

export class ReportService {
  static async getOccupancyStats(): Promise<OccupancyStats> {
    const response = await apiClient.get('/api/reports/occupancy');
    return response.data.data;
  }

  static async getCheckoutForecast(): Promise<CheckoutForecast> {
    const response = await apiClient.get('/api/reports/checkout-forecast');
    return response.data.data;
  }

  static async getVacancyForecast(): Promise<VacancyForecast> {
    const response = await apiClient.get('/api/reports/vacancy-forecast');
    return response.data.data;
  }

  static async getReservationForecast(): Promise<ReservationForecast> {
    const response = await apiClient.get('/api/reports/reservation-forecast');
    return response.data.data;
  }
}

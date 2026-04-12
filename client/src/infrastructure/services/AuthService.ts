import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import type { AuthRepository, AuthResponse, RefreshResponse, RegisterPayload } from '../../domain/repositories/AuthRepository';
import type { User } from '../../domain/entities/User';

export class AuthService implements AuthRepository {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>(ENDPOINTS.AUTH.REGISTER, payload);
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>(ENDPOINTS.AUTH.LOGIN, { email, password });
    return data;
  }

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const { data } = await apiClient.post<RefreshResponse>(ENDPOINTS.AUTH.REFRESH, { refreshToken });
    return data;
  }

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.RESET_PASSWORD, { token, newPassword });
  }

  async logout(): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
  }

  async getMe(): Promise<User> {
    const { data } = await apiClient.get<User>(ENDPOINTS.USER.ME);
    return data;
  }
}

// Export a singleton instance
export const authService = new AuthService();

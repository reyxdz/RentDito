import type {
  AuthRepository,
  AuthResponse,
  RegisterPayload,
  RefreshResponse,
} from '../../domain/repositories/AuthRepository';
import type { User } from '../../domain/entities/User';
import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';

/**
 * Maps the server user object (which uses `_id`) to the frontend User entity
 * that expects `id`. Also strips any leftover `__v` field.
 */
const mapUser = (raw: Record<string, unknown>): User => {
  const { _id, __v, ...rest } = raw;
  return {
    id: (_id as string) ?? (raw.id as string),
    ...rest,
  } as User;
};

/**
 * Concrete AuthService implementing the domain AuthRepository contract.
 * All calls go through `apiClient` which already handles Bearer-token
 * injection and 401 → refresh → retry logic.
 */
export class AuthService implements AuthRepository {
  /**
   * POST /api/auth/register
   * Server returns: { status, message, data: { user, accessToken, refreshToken } }
   */
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data: envelope } = await apiClient.post(ENDPOINTS.AUTH.REGISTER, payload);
    const { user, accessToken, refreshToken } = envelope.data;
    return { user: mapUser(user), accessToken, refreshToken };
  }

  /**
   * POST /api/auth/login
   * Server returns: { status, message, data: { user, accessToken, refreshToken } }
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data: envelope } = await apiClient.post(ENDPOINTS.AUTH.LOGIN, {
      email,
      password,
    });
    const { user, accessToken, refreshToken } = envelope.data;
    return { user: mapUser(user), accessToken, refreshToken };
  }

  /**
   * POST /api/auth/refresh
   * Server returns: { status, message, data: { user, accessToken, refreshToken } }
   * Used for session hydration on app mount and for token rotation.
   */
  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const { data: envelope } = await apiClient.post(ENDPOINTS.AUTH.REFRESH, {
      refreshToken,
    });
    const result: RefreshResponse = {
      accessToken: envelope.data.accessToken,
    };
    if (envelope.data.refreshToken) {
      result.refreshToken = envelope.data.refreshToken;
    }
    // Attach mapped user when the server provides it (used for session hydration)
    if (envelope.data.user) {
      (result as AuthResponse).user = mapUser(envelope.data.user);
    }
    return result;
  }

  /**
   * POST /api/auth/forgot-password
   */
  async forgotPassword(email: string): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
  }

  /**
   * POST /api/auth/reset-password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.RESET_PASSWORD, {
      token,
      password: newPassword,
    });
  }

  /**
   * POST /api/auth/logout  (requires Bearer token — handled by apiClient interceptor)
   */
  async logout(): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
  }
}

/** Singleton instance used throughout the application */
export const authService = new AuthService();

import type { AuthRepository, AuthResponse, RegisterPayload, RefreshResponse } from '../../domain/repositories/AuthRepository';
import type { User } from '../../domain/entities/User';

const commonFields = {
  phone: '09123456789',
  status: 'active' as const,
  verificationStatus: 'verified' as const,
  idPhotos: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const MOCK_USERS: Record<string, User> = {
  'admin@rentdito.com': {
    id: 'usr_admin_1',
    name: 'Super Admin',
    email: 'admin@rentdito.com',
    role: 'super_admin',
    avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=5a31e8&color=fff',
    ...commonFields
  },
  'landlord@rentdito.com': {
    id: 'usr_landlord_2',
    name: 'Primary Landlord',
    email: 'landlord@rentdito.com',
    role: 'landlord',
    avatar: 'https://ui-avatars.com/api/?name=Primary+Landlord&background=2bd0f8&color=000',
    ...commonFields
  },
  'tenant@rentdito.com': {
    id: 'usr_tenant_3',
    name: 'Jane Tenant',
    email: 'tenant@rentdito.com',
    role: 'user',
    avatar: 'https://ui-avatars.com/api/?name=Jane+Tenant&background=4caf50&color=fff',
    ...commonFields
  }
};

export class MockAuthService implements AuthRepository {
  async register(_payload: RegisterPayload): Promise<AuthResponse> {
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      user: MOCK_USERS['tenant@rentdito.com'],
      accessToken: 'mock_access_token',
      refreshToken: 'mock_refresh_token'
    };
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    await new Promise(resolve => setTimeout(resolve, 800));
    if (!email || !password) throw new Error('Email and password are required');
    const user = MOCK_USERS[email.toLowerCase()];
    if (!user) throw new Error('Invalid credentials');
    return {
      user,
      accessToken: 'mock_access_token',
      refreshToken: 'mock_refresh_token'
    };
  }

  async refresh(_refreshToken: string): Promise<RefreshResponse> {
    return { accessToken: 'mock_access_token' };
  }

  async forgotPassword(_email: string): Promise<void> {}
  async resetPassword(_token: string, _newPassword: string): Promise<void> {}
  async logout(): Promise<void> {}
}

export const authService = new MockAuthService();

import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import type { User } from '../../domain/entities/User';

const MOCK_USERS: Record<string, User> = {
  'admin@rentdito.com': {
    id: 'usr_admin_1',
    name: 'Super Admin',
    email: 'admin@rentdito.com',
    role: 'admin',
    avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=5a31e8&color=fff',
  },
  'landlord@rentdito.com': {
    id: 'usr_landlord_2',
    name: 'Primary Landlord',
    email: 'landlord@rentdito.com',
    role: 'landlord',
    avatar: 'https://ui-avatars.com/api/?name=Primary+Landlord&background=2bd0f8&color=000',
  },
  'tenant@rentdito.com': {
    id: 'usr_tenant_3',
    name: 'Jane Tenant',
    email: 'tenant@rentdito.com',
    role: 'tenant',
    avatar: 'https://ui-avatars.com/api/?name=Jane+Tenant&background=4caf50&color=fff',
  }
};

export class MockAuthService implements AuthRepository {
  async login(email: string, password: string): Promise<User> {
    // Simulate database network latency
    await new Promise(resolve => setTimeout(resolve, 800));

    // Basic mock validation (checking if email exists, ignoring password for now since it's a mock)
    // To make it slightly realistic, we will simulate a rejection if password is empty or email is unrecognized
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const user = MOCK_USERS[email.toLowerCase()];
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    return user;
  }
}

// Export a singleton instance
export const authService = new MockAuthService();

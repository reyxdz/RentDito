import type { User } from '../entities/User';

export interface AuthRepository {
  login(email: string, password: string): Promise<User>;
}

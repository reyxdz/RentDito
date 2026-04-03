export type Role = 'admin' | 'landlord' | 'tenant';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

import { apiClient as api } from '../api/apiClient';

export interface AuditLog {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  } | string | null;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  ip?: string;
  timestamp: string;
}

export interface ActivityLogResponse {
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class AdminService {
  /**
   * Get platform statistics
   */
  async getStats() {
    const response = await api.get('/api/admin/stats');
    return response.data;
  }

  /**
   * Get all users
   */
  async getUsers(params?: any) {
    const response = await api.get('/api/admin/users', { params });
    return response.data;
  }

  /**
   * Update user status (suspend/activate)
   */
  async updateUserStatus(userId: string, status: 'active' | 'suspended') {
    const response = await api.patch(`/api/admin/users/${userId}/status`, { status });
    return response.data;
  }

  /**
   * Get activity log
   */
  async getActivityLog(params?: any): Promise<ActivityLogResponse> {
    const response = await api.get('/api/admin/activity', { params });
    return response.data;
  }

  /**
   * Get pending user verifications
   */
  async getPendingVerifications(params?: any) {
    const response = await api.get('/api/admin/verifications', { params });
    return response.data;
  }

  /**
   * Approve user verification
   */
  async approveVerification(userId: string) {
    const response = await api.patch(`/api/admin/verifications/${userId}/approve`);
    return response.data;
  }

  /**
   * Reject user verification
   */
  async rejectVerification(userId: string, reason?: string) {
    const response = await api.patch(`/api/admin/verifications/${userId}/reject`, { reason });
    return response.data;
  }

  /**
   * Get landlord applications
   */
  async getLandlordApplications(params?: any) {
    const response = await api.get('/api/landlord-applications', { params });
    return response.data;
  }

  /**
   * Approve landlord application
   */
  async approveLandlordApplication(id: string) {
    const response = await api.patch(`/api/landlord-applications/${id}/approve`);
    return response.data;
  }

  /**
   * Reject landlord application
   */
  async rejectLandlordApplication(id: string, reviewNotes?: string) {
    const response = await api.patch(`/api/landlord-applications/${id}/reject`, { reviewNotes });
    return response.data;
  }
}

export default new AdminService();

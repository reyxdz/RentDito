import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import type { User } from '../../domain/entities/User';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  positionName: string;
  permissions: string[];
  assignedPropertyIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InviteStaffPayload {
  name: string;
  email: string;
  positionName?: string;
  permissions?: string[];
  assignedPropertyIds?: string[];
}

/** Map MongoDB _id to client-side id */
const mapStaff = (s: any): StaffMember => ({
  ...s,
  id: s._id || s.id,
});

export class TeamService {
  async getStaff(): Promise<StaffMember[]> {
    const { data } = await apiClient.get(ENDPOINTS.TEAM.ROOT);
    const raw = data.data || data;
    return Array.isArray(raw) ? raw.map(mapStaff) : [];
  }

  async inviteStaff(payload: InviteStaffPayload): Promise<StaffMember> {
    const { data } = await apiClient.post(ENDPOINTS.TEAM.ROOT, payload);
    return mapStaff(data.data || data);
  }

  async updatePermissions(staffId: string, permissions: string[]): Promise<StaffMember> {
    const { data } = await apiClient.patch(ENDPOINTS.TEAM.UPDATE_PERMISSIONS(staffId), { permissions });
    return mapStaff(data.data || data);
  }

  async updateAssignedProperties(staffId: string, propertyIds: string[]): Promise<StaffMember> {
    const { data } = await apiClient.patch(ENDPOINTS.TEAM.UPDATE_PROPERTIES(staffId), { propertyIds });
    return mapStaff(data.data || data);
  }

  async removeStaff(staffId: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.TEAM.DELETE(staffId));
  }
}

export const teamService = new TeamService();

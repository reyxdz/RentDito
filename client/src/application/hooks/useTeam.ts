import { useState, useEffect, useCallback } from 'react';
import { teamService } from '../../infrastructure/services/TeamService';
import type { StaffMember, InviteStaffPayload } from '../../infrastructure/services/TeamService';

export function useTeam() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await teamService.getStaff();
      setStaff(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch staff');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const inviteStaff = async (payload: InviteStaffPayload): Promise<StaffMember> => {
    try {
      const newStaff = await teamService.inviteStaff(payload);
      setStaff(prev => [newStaff, ...prev]);
      return newStaff;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to invite staff');
    }
  };

  const updatePermissions = async (staffId: string, permissions: string[]) => {
    try {
      const updated = await teamService.updatePermissions(staffId, permissions);
      setStaff(prev => prev.map(s => s.id === staffId ? updated : s));
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update permissions');
    }
  };

  const updateAssignedProperties = async (staffId: string, propertyIds: string[]) => {
    try {
      const updated = await teamService.updateAssignedProperties(staffId, propertyIds);
      setStaff(prev => prev.map(s => s.id === staffId ? updated : s));
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update assigned properties');
    }
  };

  const removeStaff = async (staffId: string) => {
    try {
      await teamService.removeStaff(staffId);
      setStaff(prev => prev.filter(s => s.id !== staffId));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to remove staff');
    }
  };

  return {
    staff,
    loading,
    error,
    refresh: fetchStaff,
    inviteStaff,
    updatePermissions,
    updateAssignedProperties,
    removeStaff,
  };
}

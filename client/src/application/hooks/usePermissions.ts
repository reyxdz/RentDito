import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import type { MenuItem } from '../config/menuConfig';

/**
 * Filters a menu item list based on the current user's permissions.
 *
 * Rules:
 *  - Landlords (role === 'landlord') see ALL items (they own the hub).
 *  - Staff see only items whose `permissionKey` is in `user.permissions[]`.
 *  - Items without a `permissionKey` are always visible.
 *  - Items with `requiresTenancy` are only visible when `user.activeTenancy` exists.
 */
export function usePermissions(items: MenuItem[]): MenuItem[] {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) return [];

    return items.filter((item) => {
      // Tenancy gate
      if (item.requiresTenancy && !user.activeTenancy) {
        return false;
      }

      // Permission gate (only applies in the hub)
      if (item.permissionKey) {
        // Landlords bypass — they own everything
        if (user.role === 'landlord') return true;

        // Staff must have the specific permission
        if (user.role === 'staff') {
          return user.permissions?.includes(item.permissionKey) ?? false;
        }

        // super_admin in hub context (unlikely but safe)
        if (user.role === 'super_admin') return true;

        // Regular users shouldn't be in the hub, but deny gracefully
        return false;
      }

      return true;
    });
  }, [user, items]);
}

import { useAuth } from '../../application/context/AuthContext';
import { USER_MENU_ITEMS } from '../../application/config/menuConfig';
import DashboardShell from './DashboardShell';

export default function UserLayout() {
  const { user } = useAuth();

  // Filter items by tenancy requirement
  const visibleItems = USER_MENU_ITEMS.filter((item) => {
    if (item.requiresTenancy && !user?.activeTenancy) return false;
    return true;
  });

  const hasTenancy = !!user?.activeTenancy;

  return (
    <DashboardShell
      brandTitle="My Account"
      appBarFallback="My Account"
      menuItems={visibleItems}
      showSectionLabels
      profileConfig={{
        subtitle: user?.email,
        chipLabel: hasTenancy ? 'Active Tenant' : undefined,
        chipColor: 'success',
      }}
    />
  );
}

import { useAuth } from '../../application/context/AuthContext';
import { USER_MENU_ITEMS } from '../../application/config/menuConfig';
import DashboardLayout from './DashboardLayout';

export default function UserLayout() {
  const { user } = useAuth();

  // Filter items that require an active tenancy
  const visibleItems = USER_MENU_ITEMS.filter((item) => {
    if (item.requiresTenancy && !user?.activeTenancy) return false;
    return true;
  });

  const hasTenancy = !!user?.activeTenancy;

  return (
    <DashboardLayout
      brandTitle="My Account"
      menuItems={visibleItems}
      profileSubtitle={user?.email}
      chipLabel={hasTenancy ? 'Active Tenant' : undefined}
      chipColor="success"
      pageTitle="My Account"
    />
  );
}

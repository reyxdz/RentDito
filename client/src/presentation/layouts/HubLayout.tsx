import { useAuth } from '../../application/context/AuthContext';
import { usePermissions } from '../../application/hooks/usePermissions';
import { HUB_MENU_ITEMS } from '../../application/config/menuConfig';
import DashboardShell from './DashboardShell';

export default function HubLayout() {
  const { user } = useAuth();

  // Permission-filtered menu
  const visibleItems = usePermissions(HUB_MENU_ITEMS);

  // Derive display label for the staff position
  const isStaff = user?.role === 'staff';
  const positionLabel = isStaff ? (user?.positionName || 'Staff') : 'Landlord';

  return (
    <DashboardShell
      brandTitle="RentDito Hub"
      appBarFallback="Hub"
      menuItems={visibleItems}
      showSectionLabels
      profileConfig={{
        subtitle: positionLabel,
        chipLabel: positionLabel,
        chipColor: isStaff ? 'secondary' : 'primary',
      }}
    />
  );
}

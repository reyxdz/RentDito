import { useAuth } from '../../application/context/AuthContext';
import { usePermissions } from '../../application/hooks/usePermissions';
import { HUB_MENU_ITEMS } from '../../application/config/menuConfig';
import DashboardLayout from './DashboardLayout';

export default function HubLayout() {
  const { user } = useAuth();
  const visibleItems = usePermissions(HUB_MENU_ITEMS);

  const isStaff = user?.role === 'staff';
  const positionLabel = isStaff ? (user?.positionName || 'Staff') : 'Landlord';

  return (
    <DashboardLayout
      brandTitle="RentDito Hub"
      menuItems={visibleItems}
      profileSubtitle={positionLabel}
      chipLabel={positionLabel}
      chipColor={isStaff ? 'secondary' : 'primary'}
      pageTitle="Hub"
    />
  );
}

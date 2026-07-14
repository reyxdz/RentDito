import { useAuth } from '../../application/context/AuthContext';
import { ADMIN_MENU_ITEMS } from '../../application/config/menuConfig';
import DashboardLayout from './DashboardLayout';

export default function AdminLayout() {
  const { user } = useAuth();

  return (
    <DashboardLayout
      brandTitle="Admin Panel"
      menuItems={ADMIN_MENU_ITEMS}
      profileSubtitle={user?.email}
      pageTitle="Dashboard"
    />
  );
}

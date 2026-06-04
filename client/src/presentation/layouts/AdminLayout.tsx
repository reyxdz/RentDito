import { useAuth } from '../../application/context/AuthContext';
import { ADMIN_MENU_ITEMS } from '../../application/config/menuConfig';
import DashboardShell from './DashboardShell';

export default function AdminLayout() {
  const { user } = useAuth();

  return (
    <DashboardShell
      brandTitle="Admin Panel"
      appBarFallback="Dashboard"
      menuItems={ADMIN_MENU_ITEMS}
      showSectionLabels={false}
      profileConfig={{
        subtitle: user?.email,
      }}
    />
  );
}

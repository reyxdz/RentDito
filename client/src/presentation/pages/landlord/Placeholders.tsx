import { Box, Typography, Card } from '@mui/material';

const PlaceholderTemplate = ({ title, description }: { title: string, description: string }) => (
  <Box sx={{ minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
    <Box sx={{ mb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 1, letterSpacing: -0.5 }}>
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {description}
      </Typography>
    </Box>
    <Card sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, bgcolor: 'background.paper', border: '1px dashed', borderColor: 'divider', boxShadow: 'none' }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>Work in Progress</Typography>
        <Typography variant="body2" color="text.disabled">This landlord dashboard module is currently under construction.</Typography>
      </Box>
    </Card>
  </Box>
);

export const PropertiesPlaceholder = () => <PlaceholderTemplate title="Properties Portfolio" description="Add, edit, and manage your rental properties and building listings." />;
export const UnitsPlaceholder = () => <PlaceholderTemplate title="Units & Rooms" description="Configure specific units, pricing maps, and availability calendars per property." />;
export const BookingsPlaceholder = () => <PlaceholderTemplate title="Tenant Bookings" description="Review reservation requests, past bookings, and handle check-in/check-out flows." />;
export const FinancialsPlaceholder = () => <PlaceholderTemplate title="Revenue & Financials" description="Track your inbound rent, platform commissions, and historical statements." />;
export const AgentsPlaceholder = () => <PlaceholderTemplate title="Agent Management" description="Assign agents to properties and track their individual performance metrics." />;
export const MaintenancePlaceholder = () => <PlaceholderTemplate title="Maintenance Operations" description="Deploy staff and efficiently track repair tickets submitted by your tenants." />;

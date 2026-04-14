import { Box, Typography, Card, CardContent } from '@mui/material';

const PlaceholderView = ({ title, description }: { title: string, description: string }) => (
  <Box sx={{ maxWidth: 800 }}>
    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>{title}</Typography>
    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>{description}</Typography>
    
    <Card variant="outlined" sx={{ borderStyle: 'dashed', borderWidth: 2, bgcolor: 'transparent' }}>
      <CardContent sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>Under Construction</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          The {title} interface is currently being developed following the approved architectural layout.
        </Typography>
      </CardContent>
    </Card>
  </Box>
);

export const HubPropertiesPlaceholder = () => <PlaceholderView title="Properties" description="Manage all your rental properties in one place." />;
export const HubUnitsPlaceholder = () => <PlaceholderView title="Units & Rooms" description="Configure rooms, bedspaces, pricing, and slot allocations." />;
export const HubTenantsPlaceholder = () => <PlaceholderView title="Tenants" description="View and manage your active tenants and their records." />;
export const HubPipelinePlaceholder = () => <PlaceholderView title="Pipeline" description="Track inquiries, visit requests, and rental applications." />;
export const HubBookingsPlaceholder = () => <PlaceholderView title="Bookings" description="Manage pending and confirmed bookings across properties." />;
export const HubBillingPlaceholder = () => <PlaceholderView title="Billing" description="Generate and track bills for all active tenancies." />;
export const HubContractsPlaceholder = () => <PlaceholderView title="Contracts" description="Create and manage rental contracts and agreements." />;
export const HubUtilitiesPlaceholder = () => <PlaceholderView title="Utilities" description="Track utility meters and configure reading schedules." />;
export const HubFinancialsPlaceholder = () => <PlaceholderView title="Financials" description="Monitor revenue, expenses, and generate financial reports." />;
export const HubInventoryPlaceholder = () => <PlaceholderView title="Inventory" description="Track property assets, appliances, and furniture records." />;
export const HubMaintenancePlaceholder = () => <PlaceholderView title="Maintenance" description="Manage maintenance tickets and work orders." />;
export const HubDocumentsPlaceholder = () => <PlaceholderView title="Documents" description="Store and organize property-related documents." />;
export const HubReportsPlaceholder = () => <PlaceholderView title="Reports" description="Generate business analytics and performance reports." />;
export const HubSecurityPlaceholder = () => <PlaceholderView title="Security" description="Audit logs, access control, and security settings." />;

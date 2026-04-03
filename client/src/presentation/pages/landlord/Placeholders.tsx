import { Box, Typography, Card } from '@mui/material';

const PlaceholderTemplate = () => (
  <Box sx={{ minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
    <Card sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, bgcolor: 'background.paper', border: '1px dashed', borderColor: 'divider', boxShadow: 'none' }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>Work in Progress</Typography>
        <Typography variant="body2" color="text.disabled">This landlord dashboard module is currently under construction.</Typography>
      </Box>
    </Card>
  </Box>
);

export const PropertiesPlaceholder = () => <PlaceholderTemplate />;
export const UnitsPlaceholder = () => <PlaceholderTemplate />;
export const BookingsPlaceholder = () => <PlaceholderTemplate />;
export const FinancialsPlaceholder = () => <PlaceholderTemplate />;
export const AgentsPlaceholder = () => <PlaceholderTemplate />;
export const MaintenancePlaceholder = () => <PlaceholderTemplate />;

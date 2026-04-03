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

export const PropertiesPlaceholder = () => <PlaceholderView title="Properties & Listings" description="Queue, approve, and flag property listings across the platform." />;
export const FinancialsPlaceholder = () => <PlaceholderView title="Financial Management" description="Monitor payments, refunds, revenues, and transaction auditing." />;
export const ReportsPlaceholder = () => <PlaceholderView title="Reporting & Analytics" description="Deep dive into system growth, metrics, and KPI analytics." />;
export const ModerationPlaceholder = () => <PlaceholderView title="Moderation & Compliance" description="Assess flagged content, verify compliance, and audit system logs." />;
export const CommunicationsPlaceholder = () => <PlaceholderView title="Communications & Support" description="Support tickets, mass emails, and active user notification broadcasts." />;
export const SystemPlaceholder = () => <PlaceholderView title="System Architecture" description="Platform settings, feature flags, health, and server logs." />;
export const SecurityPlaceholder = () => <PlaceholderView title="Security & Fraud Prevention" description="Fraud alerts, suspicious activity tracking, and 2FA auditing." />;

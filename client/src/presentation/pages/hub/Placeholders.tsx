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

export const HubFinancialsPlaceholder = () => <PlaceholderView title="Financials" description="Monitor revenue, expenses, and generate financial reports." />;

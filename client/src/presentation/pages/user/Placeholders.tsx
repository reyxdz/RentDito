import { Box, Typography, Card, CardContent } from '@mui/material';

const PlaceholderView = ({ title, description }: { title: string, description: string }) => (
  <Box sx={{ maxWidth: 800 }}>
    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>{title}</Typography>
    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>{description}</Typography>
    
    <Card variant="outlined" sx={{ borderStyle: 'dashed', borderWidth: 2, bgcolor: 'transparent' }}>
      <CardContent sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>Under Construction</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          The {title} interface is currently being developed.
        </Typography>
      </CardContent>
    </Card>
  </Box>
);


export const UserInquiries = () => <PlaceholderView title="My Inquiries" description="Track your property inquiries and messages with landlords." />;
export const UserBookings = () => <PlaceholderView title="My Bookings" description="View your pending and confirmed bookings." />;
export const UserMyUnit = () => <PlaceholderView title="My Unit" description="View details about your currently rented unit." />;
export const UserBills = () => <PlaceholderView title="My Bills" description="View and pay outstanding bills for your tenancy." />;
export const UserContract = () => <PlaceholderView title="My Contract" description="View your active rental contract and terms." />;
export const UserMaintenance = () => <PlaceholderView title="Maintenance Requests" description="Submit and track maintenance requests for your unit." />;

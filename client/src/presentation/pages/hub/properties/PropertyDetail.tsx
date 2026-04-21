import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Tabs, Tab, Button, Typography, Divider, Paper, Grid, Card, CardContent, CircularProgress, Chip } from '@mui/material';
import { ArrowBack, Settings, Map, Apartment, Description } from '@mui/icons-material';
import PageHeader from '../../../components/PageHeader';
import StatusBadge from '../../../components/StatusBadge';
import { useProperty } from '../../../../application/hooks/useProperty';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`property-tabpanel-${index}`}
      aria-labelledby={`property-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function PropertyDetail() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const { property, loading, error } = useProperty(propertyId);
  const [tabIndex, setTabIndex] = useState(0);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  if (error || !property) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/hub/properties')} sx={{ mb: 2 }}>Back to Properties</Button>
        <Typography color="error">{error || 'Property not found'}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/hub/properties')} sx={{ mb: 2 }}>
        Back to Properties
      </Button>

      <PageHeader
        title={property.name}
        subtitle={`${property.address.street}, ${property.address.city}, ${property.address.province}`}
        action={
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <StatusBadge status={property.status} />
            <Button variant="outlined" startIcon={<Settings />}>Manage</Button>
          </Box>
        }
      />

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabIndex} onChange={(_, nv) => setTabIndex(nv)} aria-label="property details tabs">
          <Tab icon={<Map sx={{ mr: 1 }}/>} iconPosition="start" label="Overview" />
          <Tab icon={<Apartment sx={{ mr: 1 }}/>} iconPosition="start" label="Units" />
          <Tab icon={<Description sx={{ mr: 1 }}/>} iconPosition="start" label="Documents" />
          <Tab icon={<Settings sx={{ mr: 1 }}/>} iconPosition="start" label="Settings" />
        </Tabs>
      </Box>

      <CustomTabPanel value={tabIndex} index={0}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Description</Typography>
                <Typography variant="body2" color="text.secondary">
                  {property.description || 'No description provided.'}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="h6" gutterBottom>Inclusions</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {property.inclusions?.length ? property.inclusions.map((inc, i) => (
                    <Chip key={i} label={inc} size="small" />
                  )) : <Typography variant="body2" color="text.secondary">None specified</Typography>}
                </Box>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                 <Typography variant="h6" gutterBottom>Nearby Venues</Typography>
                 {property.schools?.length > 0 && (
                   <Box sx={{ mb: 2 }}>
                     <Typography variant="subtitle2">Schools</Typography>
                     {property.schools.map((v, i) => (
                       <Typography key={i} variant="body2" color="text.secondary">
                         • {v.name} ({v.walking} walk / {v.commute} commute)
                       </Typography>
                     ))}
                   </Box>
                 )}
                 {property.reviewCenters?.length > 0 && (
                   <Box sx={{ mb: 2 }}>
                     <Typography variant="subtitle2">Review Centers</Typography>
                     {property.reviewCenters.map((v, i) => (
                       <Typography key={i} variant="body2" color="text.secondary">
                         • {v.name} ({v.walking} walk / {v.commute} commute)
                       </Typography>
                     ))}
                   </Box>
                 )}
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Metrics</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>Total Units: {property.metrics.totalUnits}</Typography>
              <Typography variant="body2" sx={{ mb: 1, color: 'success.main' }}>Active Units: {property.metrics.activeUnits}</Typography>
              <Typography variant="body2" sx={{ mb: 1, color: 'warning.main' }}>Vacant Units: {property.metrics.vacantUnits}</Typography>
            </Paper>

            <Typography variant="h6" gutterBottom>Images ({property.images?.length || 0})</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {property.images?.map((img, i) => (
                <Box key={i} component="img" src={img} alt={`Property view ${i}`} sx={{ width: '100%', borderRadius: 1, objectFit: 'cover' }} />
              ))}
            </Box>
          </Grid>
        </Grid>
      </CustomTabPanel>

      <CustomTabPanel value={tabIndex} index={1}>
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">Units Management</Typography>
          <Typography variant="body2" color="text.secondary">List of units will appear here.</Typography>
        </Paper>
      </CustomTabPanel>

      <CustomTabPanel value={tabIndex} index={2}>
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">Documents</Typography>
          <Typography variant="body2" color="text.secondary">Contracts, permits, and related documents.</Typography>
        </Paper>
      </CustomTabPanel>

      <CustomTabPanel value={tabIndex} index={3}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
             <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>Billing Settings</Typography>
                  {property.billingSettings ? (
                    <>
                      <Typography variant="body2" sx={{ mb: 1 }}>Billing Day: {property.billingSettings.billingDay}</Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>Due Day: {property.billingSettings.dueDay}</Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>Late Fee: {property.billingSettings.lateFeePercent}%</Typography>
                    </>
                  ) : <Typography variant="body2" color="text.secondary">Not configured.</Typography>}
                </CardContent>
             </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
             <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>Emergency Contacts</Typography>
                  {property.emergencyContacts?.length ? (
                    property.emergencyContacts.map((c, i) => (
                      <Box key={i} sx={{ mb: 1 }}>
                        <Typography variant="subtitle2">{c.name} ({c.role})</Typography>
                        <Typography variant="body2" color="text.secondary">{c.phone}</Typography>
                      </Box>
                    ))
                  ) : <Typography variant="body2" color="text.secondary">No contacts added.</Typography>}
                </CardContent>
             </Card>
          </Grid>
        </Grid>
      </CustomTabPanel>
    </Box>
  );
}

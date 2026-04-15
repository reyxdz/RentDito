import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Tabs, Tab, Button, Typography, Divider, Grid, Card, CardContent, CircularProgress, Paper, Chip } from '@mui/material';
import { ArrowBack, Map, Person, Receipt, Inventory as InventoryIcon, Edit } from '@mui/icons-material';
import PageHeader from '../../../components/PageHeader';
import StatusBadge from '../../../components/StatusBadge';
import ImageCarousel from '../../../components/ImageCarousel';
import { useUnitDetail } from '../../../../application/hooks/useUnitDetail';
import type { Slot } from '../../../../domain/entities/Unit';

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
      id={`unit-tabpanel-${index}`}
      aria-labelledby={`unit-tab-${index}`}
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

export default function UnitDetail() {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const { unit, property, loading, error } = useUnitDetail(unitId);
  const [tabIndex, setTabIndex] = useState(0);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  if (error || !unit) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/hub/units')} sx={{ mb: 2 }}>Back to Units</Button>
        <Typography color="error">{error || 'Unit not found'}</Typography>
      </Box>
    );
  }

  const propertyName = property?.name || 'Unknown Property';

  const renderSlotGrid = (slots?: Slot[]) => {
    if (!slots || slots.length === 0) {
      return <Typography color="text.secondary">No slot details available.</Typography>;
    }

    return (
      <Grid container spacing={2}>
        {slots.map((slot) => (
          <Grid size={{ xs: 6, sm: 4, md: 3 }} key={slot.slotNumber}>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 2, 
                textAlign: 'center',
                borderColor: slot.status === 'vacant' ? 'success.main' : 'divider',
                bgcolor: slot.status === 'vacant' ? 'success.50' : 'background.paper'
              }}
            >
              <Typography variant="h6">Slot {slot.slotNumber}</Typography>
              <StatusBadge status={slot.status as any} />
            </Paper>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/hub/units')} sx={{ mb: 2 }}>
        Back to Units
      </Button>

      <PageHeader
        title={unit.unitIdentifier}
        subtitle={`Located in ${propertyName}`}
        action={
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <StatusBadge status={unit.status} />
            <Button variant="outlined" startIcon={<Edit />}>Edit Unit</Button>
          </Box>
        }
      />

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabIndex} onChange={(_, nv) => setTabIndex(nv)} aria-label="unit details tabs">
          <Tab icon={<Map sx={{ mr: 1 }}/>} iconPosition="start" label="Overview" />
          <Tab icon={<Person sx={{ mr: 1 }}/>} iconPosition="start" label="Tenants" />
          <Tab icon={<Receipt sx={{ mr: 1 }}/>} iconPosition="start" label="Billing History" />
          <Tab icon={<InventoryIcon sx={{ mr: 1 }}/>} iconPosition="start" label="Inventory" />
        </Tabs>
      </Box>

      {/* OVERVIEW TAB */}
      <CustomTabPanel value={tabIndex} index={0}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 8 }}>
            {unit.images && unit.images.length > 0 && (
              <Box sx={{ mb: 4, height: 400, borderRadius: 2, overflow: 'hidden' }}>
                <ImageCarousel images={unit.images} />
              </Box>
            )}

            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Features</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {unit.features?.length ? unit.features.map((f, i) => (
                    <Chip key={i} label={f} size="small" />
                  )) : <Typography variant="body2" color="text.secondary">No features specified</Typography>}
                </Box>
                
                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>Bedspace Slots</Typography>
                {unit.accommodationType === 'bedspace' ? (
                  <Box sx={{ mt: 2 }}>
                    {renderSlotGrid(unit.slots)}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    This unit is rented as an entire room. Slots are not tracked individually unless converted to bedspace.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Pricing Details</Typography>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>Accommodation Type</Typography>
              <Typography variant="body1" fontWeight={600} sx={{ mb: 2, textTransform: 'capitalize' }}>
                {unit.accommodationType}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Room Rent</Typography>
                <Typography variant="body1" fontWeight={600}>₱{unit.roomRent?.toLocaleString() || 0} / mo</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Bedspace Rent</Typography>
                <Typography variant="body1" fontWeight={600}>₱{unit.bedspaceRent?.toLocaleString() || 0} / mo</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Deposit</Typography>
                <Typography variant="body1" fontWeight={600}>₱{unit.deposit?.toLocaleString() || 0}</Typography>
              </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Capacity Metrics</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>Current Occupants: <strong>{unit.capacity}</strong></Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>Max Occupants: <strong>{unit.maxOccupants}</strong></Typography>
              {unit.sizeSqm && (
                <Typography variant="body2">Size: <strong>{unit.sizeSqm} sqm</strong></Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </CustomTabPanel>

      {/* TENANTS TAB */}
      <CustomTabPanel value={tabIndex} index={1}>
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">Current & Past Tenants</Typography>
          <Typography variant="body2" color="text.secondary">List of associated tenancies will appear here.</Typography>
        </Paper>
      </CustomTabPanel>

      {/* BILLING HISTORY TAB */}
      <CustomTabPanel value={tabIndex} index={2}>
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">Billing History</Typography>
          <Typography variant="body2" color="text.secondary">Records of rent and utility payments for this unit.</Typography>
        </Paper>
      </CustomTabPanel>

      {/* INVENTORY TAB */}
      <CustomTabPanel value={tabIndex} index={3}>
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">Unit Inventory</Typography>
          <Typography variant="body2" color="text.secondary">Track furniture and appliances specific to this unit.</Typography>
        </Paper>
      </CustomTabPanel>
    </Box>
  );
}

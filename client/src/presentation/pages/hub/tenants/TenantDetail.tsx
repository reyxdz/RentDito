import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, CircularProgress,
  Grid, Card, CardContent, Dialog, DialogTitle, DialogContent
  Grid, Card, CardContent, Dialog, DialogTitle, DialogContent

} from '@mui/material';
import {
  ArrowBack, Person as PersonIcon, Home as HomeIcon,
  Description as ContractIcon,
  Output as CheckoutIcon
} from '@mui/icons-material';
import { useTenantDetail } from '../../../../application/hooks/useTenants';
import StatusBadge from '../../../components/StatusBadge';
import CheckoutFlow from '../pipeline/CheckoutFlow';
import CheckoutFlow from '../pipeline/CheckoutFlow';


export default function TenantDetail() {
  const { tenancyId } = useParams<{ tenancyId: string }>();
  const navigate = useNavigate();
  const { tenancy, loading, error, fetchTenancy, checkout } = useTenantDetail(tenancyId);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [_actionLoading, setActionLoading] = useState(false);
  const [_actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchTenancy();
  }, [fetchTenancy]);

  const handleCheckout = async () => {
    setActionLoading(true);
    try {
      await checkout();
      setCheckoutOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  if (error || !tenancy) {
    return (
      <Box sx={{ p: 4 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/hub/tenants')} sx={{ mb: 2 }}>Back to Tenants</Button>
        <Typography color="error">{error || 'Tenancy not found'}</Typography>
      </Box>
    );
  }

  const { personalDetails, property, unit, contract } = tenancy;

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/hub/tenants')} sx={{ mb: 3, fontWeight: 600 }}>
        Back to Tenants
      </Button>

      {/* Header Banner */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <PersonIcon sx={{ fontSize: 32 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={800}>{personalDetails?.fullName || tenancy.user?.name || 'Unknown'}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                <StatusBadge status={tenancy.status} />
                <Typography variant="body2" color="text.secondary">
                  Since {tenancy.checkInDate ? new Date(tenancy.checkInDate).toLocaleDateString() : '—'}
                </Typography>
              </Box>
            </Box>
          </Box>
          
          <Box>
            {tenancy.status === 'checked_in' && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<CheckoutIcon />}
                onClick={() => setCheckoutOpen(true)}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Initiate Checkout
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Grid Content */}
      <Grid container spacing={3}>
        {/* Unit Info */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <HomeIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={700}>Unit Location</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Property</Typography>
                  <Typography variant="body1" fontWeight={500}>{property?.name || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Unit</Typography>
                  <Typography variant="body1" fontWeight={500}>{unit?.unitIdentifier || '—'}</Typography>
                </Box>
                {tenancy.slotNumber && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Bedspace Slot</Typography>
                    <Typography variant="body1" fontWeight={500}>Slot {tenancy.slotNumber}</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Profile Info */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <PersonIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={700}>Profile</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Phone</Typography>
                  <Typography variant="body1" fontWeight={500}>{personalDetails?.phone || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Occupation</Typography>
                  <Typography variant="body1" fontWeight={500}>{personalDetails?.occupation || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Emergency Contact</Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {typeof personalDetails?.emergencyContact === 'object' && personalDetails?.emergencyContact
                      ? `${personalDetails.emergencyContact.name} (${personalDetails.emergencyContact.relationship || (personalDetails.emergencyContact as any).relation || ''}) — ${personalDetails.emergencyContact.phone}`
                      : (typeof personalDetails?.emergencyContact === 'string' ? personalDetails.emergencyContact : '—')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Contract Info */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <ContractIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={700}>Contract summary</Typography>
              </Box>
              {contract ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Monthly Rent</Typography>
                    <Typography variant="body1" fontWeight={500} color="primary.main">₱{contract.monthlyRent?.toLocaleString()}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">End Date</Typography>
                    <Typography variant="body1" fontWeight={500}>{new Date(contract.endDate).toLocaleDateString()}</Typography>
                  </Box>
                  <Box>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/hub/contracts/${contract.id}`)}
                      sx={{ mt: 1, borderRadius: 2 }}
                    >
                      View Full Contract
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Typography color="text.secondary">No contract linked.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Billing placeholders */}
        <Grid size={{ xs: 12 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Recent Activity & Activity Log</Typography>
            <Typography color="text.secondary">Activity comments and billing history will appear here.</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onClose={() => setCheckoutOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CheckoutIcon color="error" />
          Initiate Checkout
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ p: 3 }}>
            <CheckoutFlow 
              tenancy={tenancy} 
              onComplete={handleCheckout} 
              onCancel={() => setCheckoutOpen(false)} 
            />
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

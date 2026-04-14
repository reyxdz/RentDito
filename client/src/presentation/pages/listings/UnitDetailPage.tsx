import { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircleOutline,
  GroupOutlined,
  MeetingRoomOutlined,
  Phone,
  Facebook,
  WarningAmberOutlined,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useUnitDetail } from '../../../application/hooks/useUnitDetail';
import { useAuth } from '../../../application/context/AuthContext';
import ImageCarousel from '../../components/ImageCarousel';
import ConfirmDialog from '../../components/ConfirmDialog';
import Navbar from '../../components/Navbar';

export default function UnitDetailPage() {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const { unit, loading, error } = useUnitDetail(unitId);
  const { user, isAuthenticated } = useAuth();
  
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);

  const handleCTA = () => {
    if (!isAuthenticated) {
      setAuthDialogOpen(true);
      return;
    }
    if (user?.verificationStatus !== 'verified') {
      if (user?.verificationStatus === 'pending') {
        setPendingDialogOpen(true);
      } else {
        navigate('/u/verify');
      }
      return;
    }
    alert('Action authorized! Proceeding to Inquiry/Visit flow...');
  };

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-PH').format(amount);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !unit) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 10 }}>
        <Typography color="error" variant="h5" gutterBottom>
          {error || 'Unit not found'}
        </Typography>
        <Button variant="contained" onClick={() => navigate('/listings')} sx={{ mt: 2 }}>
          Back to Listings
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: 4, flexGrow: 1 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ mb: 3, color: 'text.secondary', '&:hover': { bgcolor: 'transparent', color: 'primary.main' } }}
        >
          Back to Property
        </Button>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12 }}>
            {/* Unit Images with External Arrows */}
            <Box sx={{ mb: 4, maxWidth: 1000, mx: 'auto' }}>
              <ImageCarousel
                images={unit.images}
                height={{ xs: 300, sm: 400, md: 500 }}
                borderRadius={16}
                arrowPosition="outside"
              />
            </Box>

            {/* Unit Details */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, fontSize: { xs: '2rem', sm: '3rem' } }}>
                    {unit.unitIdentifier}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={unit.accommodationType === 'room' ? 'Room for Rent' : 'Bedspace'}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 700, borderRadius: 1 }}
                    />
                    {unit.status === 'vacant' ? (
                      <Chip
                        label={`${unit.capacity} capacity`}
                        size="small"
                        color="success"
                        sx={{ fontWeight: 700, borderRadius: 1 }}
                      />
                    ) : (
                      <Chip
                        label={unit.status}
                        size="small"
                        color="error"
                        sx={{ fontWeight: 700, borderRadius: 1, textTransform: 'capitalize' }}
                      />
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', sm: 'flex-end' } }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 1, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    Monthly
                  </Typography>
                  {unit.bedspaceRent || unit.roomRent ? (
                    <>
                      {unit.bedspaceRent && (
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                          <Typography variant="h4" color="primary.main" sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', sm: '2.125rem' }, lineHeight: 1 }}>
                            ₱{formatPrice(unit.bedspaceRent)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}> per head</Typography>
                        </Box>
                      )}
                      {unit.roomRent && (
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: unit.bedspaceRent ? 1 : 0 }}>
                          {unit.bedspaceRent && (
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mr: 0.5 }}>or</Typography>
                          )}
                          <Typography variant={unit.bedspaceRent ? "h6" : "h4"} color={unit.bedspaceRent ? "text.primary" : "primary.main"} sx={{ fontWeight: 800, lineHeight: 1 }}>
                            ₱{formatPrice(unit.roomRent)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}> per room</Typography>
                        </Box>
                      )}
                    </>
                  ) : (
                    <Typography variant="h4" color="primary.main" sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                      ₱0
                    </Typography>
                  )}
                  <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                    <Button variant="outlined" color="primary" onClick={handleCTA}>Inquire</Button>
                    <Button variant="contained" color="primary" disableElevation onClick={handleCTA}>Schedule Visit</Button>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Capacity & Features */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card variant="outlined" sx={{ borderRadius: 2, border: 'none', bgcolor: 'background.default', p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <GroupOutlined sx={{ fontSize: 32, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Capacity
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {unit.capacity} person{unit.capacity > 1 ? 's' : ''}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card variant="outlined" sx={{ borderRadius: 2, border: 'none', bgcolor: 'background.default', p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <MeetingRoomOutlined sx={{ fontSize: 32, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Max Occupants
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {unit.maxOccupants}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>
              </Grid>

              <Grid container spacing={3}>
                {/* Features & Inclusions Card */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined" sx={{ borderRadius: 3, height: '100%', border: 'none', bgcolor: 'background.default' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Additional Information</Typography>
                      <List dense disablePadding>
                        {unit.features.map((item, i) => (
                          <ListItem key={i} disablePadding sx={{ mb: 1 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <CheckCircleOutline color="success" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={item} primaryTypographyProps={{ variant: 'body2' }} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Inquire Us Card */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined" sx={{ borderRadius: 3, height: '100%', border: 'none', bgcolor: 'background.default' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Inquire Us</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Phone */}
                        <Box
                          component="a"
                          href="tel:+639123456789"
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: 'action.hover',
                            textDecoration: 'none',
                            color: '#fff',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: 'primary.main',
                              color: '#fff',
                              transform: 'translateX(4px)',
                            },
                          }}
                        >
                          <Phone sx={{ fontSize: 24, color: 'inherit', flexShrink: 0 }} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              Call Us
                            </Typography>
                            <Typography variant="caption">
                              +63 (912) 345-6789
                            </Typography>
                          </Box>
                        </Box>

                        {/* Facebook */}
                        <Box
                          component="a"
                          href="https://facebook.com/rentdito"
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: 'action.hover',
                            textDecoration: 'none',
                            color: '#fff',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: 'primary.main',
                              color: '#fff',
                              transform: 'translateX(4px)',
                            },
                          }}
                        >
                          <Facebook sx={{ fontSize: 24, color: 'inherit', flexShrink: 0 }} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              Message on Facebook
                            </Typography>
                            <Typography variant="caption">
                              RentDito
                            </Typography>
                          </Box>
                        </Box>
                        {/* Safety Reminder */}
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'warning.dark', bgcolor: 'rgba(255, 152, 0, 0.05)', mt: 1 }}>
                          <WarningAmberOutlined sx={{ color: 'warning.main', mt: 0.25 }} />
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'warning.main', mb: 0.5, lineHeight: 1.2 }}>
                              Safety Reminder
                            </Typography>
                            <Typography variant="body2" color="warning.light">
                              For your safety, never send any advance payments or deposits before personally inspecting the property and verifying details with the landlord.
                            </Typography>
                          </Box>
                        </Box>

                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <Box component="footer" sx={{ py: 3, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', mt: 'auto' }}>
        <Typography variant="caption" color="text.secondary">
          © {new Date().getFullYear()} RentDito. All rights reserved.
        </Typography>
      </Box>

      {/* ── Dialogs ────────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={authDialogOpen}
        title="Authentication Required"
        message="Please log in first to inquire or schedule a visit for this property."
        confirmText="Go to Login"
        cancelText="Cancel"
        onConfirm={() => navigate('/login')}
        onCancel={() => setAuthDialogOpen(false)}
      />
      <ConfirmDialog
        open={pendingDialogOpen}
        title="Verification Pending"
        message="Your account verification is currently pending review. Please wait for approval before making inquiries."
        confirmText="Okay"
        cancelText="Go to Verification"
        onConfirm={() => setPendingDialogOpen(false)}
        onCancel={() => navigate('/u/verify')}
      />
    </Box>
  );
}

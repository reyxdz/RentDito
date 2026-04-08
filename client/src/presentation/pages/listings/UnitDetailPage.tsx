import { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircleOutline,
  GroupOutlined,
  MeetingRoomOutlined,
  Phone,
  Email,
  Facebook,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useUnitDetail } from '../../../application/hooks/useUnitDetail';
import ImageCarousel from '../../components/ImageCarousel';
import Navbar from '../../components/Navbar';

export default function UnitDetailPage() {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const { unit, loading, error } = useUnitDetail(unitId);
  const [inquireDialogOpen, setInquireDialogOpen] = useState(false);

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
          Back
        </Button>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12 }}>
            {/* Unit Images with External Arrows */}
            <Box sx={{ mb: 4, maxWidth: 1000, mx: 'auto' }}>
              <ImageCarousel 
                images={unit.images} 
                height={500} 
                borderRadius={16}
                arrowPosition="outside"
              />
            </Box>

            {/* Unit Details */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
                    {unit.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Chip 
                      label={unit.accommodationType} 
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 700, borderRadius: 1 }} 
                    />
                    {unit.vacancies > 0 ? (
                      <Chip 
                        label={`${unit.vacancies} vacancies`} 
                        size="small" 
                        color="success"
                        sx={{ fontWeight: 700, borderRadius: 1 }} 
                      />
                    ) : (
                      <Chip 
                        label="Full" 
                        size="small" 
                        color="error"
                        sx={{ fontWeight: 700, borderRadius: 1 }} 
                      />
                    )}
                  </Box>
                </Box>
                <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                  <Typography variant="h4" color="primary.main" sx={{ fontWeight: 800 }}>
                    ₱{formatPrice(unit.monthlyRent)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">per month</Typography>
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
                          Occupants
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {unit.currentOccupants}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>
              </Grid>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <Card variant="outlined" sx={{ borderRadius: 3, height: '100%', border: 'none', bgcolor: 'background.default' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Features & Inclusions</Typography>
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
              </Grid>

              <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button 
                  variant="contained" 
                  size="large"
                  disabled={unit.vacancies === 0}
                  onClick={() => setInquireDialogOpen(true)}
                >
                  Inquire Now
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* ── Inquire Modal ──────────────────────────────────────────── */}
        <Dialog
          open={inquireDialogOpen}
          onClose={() => setInquireDialogOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: 3,
              minWidth: 300,
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 700, fontSize: '1.25rem', pb: 1 }}>
            Get in Touch
          </DialogTitle>
          <DialogContent sx={{ py: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Contact us through any of these channels:
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Phone */}
              <Box
                component="a"
                href="tel:+639123456789"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: 'primary.main',
                    color: '#fff',
                    transform: 'translateX(4px)',
                  },
                }}
              >
                <Phone sx={{ fontSize: 28, color: 'primary.main' }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Call Us
                  </Typography>
                  <Typography variant="body2">
                    +63 (912) 345-6789
                  </Typography>
                </Box>
              </Box>

              {/* Email */}
              <Box
                component="a"
                href="mailto:rentdito.stay@gmail.com"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: 'primary.main',
                    color: '#fff',
                    transform: 'translateX(4px)',
                  },
                }}
              >
                <Email sx={{ fontSize: 28, color: 'primary.main' }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Email Us
                  </Typography>
                  <Typography variant="body2">
                    inquire@rentdito.com
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
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: 'primary.main',
                    color: '#fff',
                    transform: 'translateX(4px)',
                  },
                }}
              >
                <Facebook sx={{ fontSize: 28, color: 'primary.main' }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Message on Facebook
                  </Typography>
                  <Typography variant="body2">
                    RentDito
                  </Typography>
                </Box>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>
      </Container>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <Box component="footer" sx={{ py: 3, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', mt: 'auto' }}>
        <Typography variant="caption" color="text.secondary">
          © {new Date().getFullYear()} RentDito. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
}

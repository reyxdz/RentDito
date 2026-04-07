import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Grid,
  Chip,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  ArrowBack,
  LocationOnOutlined,
  CheckCircleOutline,
  InfoOutlined,
  GroupOutlined,
  Brightness4,
  Brightness7,
  MeetingRoomOutlined,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useColorMode } from '../../context/ThemeContext';
import { useAuth } from '../../../application/context/AuthContext';
import { usePropertyDetail } from '../../../application/hooks/usePropertyDetail';
import ImageCarousel from '../../components/ImageCarousel';
import logoPng from '../../../assets/logo.png';

export default function PropertyDetailPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const { mode, toggleColorMode } = useColorMode();
  const { isAuthenticated, user, logout } = useAuth();
  const { property, units, loading, error } = usePropertyDetail(propertyId);

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-PH').format(amount);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !property) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 10 }}>
        <Typography color="error" variant="h5" gutterBottom>
          {error || 'Property not found'}
        </Typography>
        <Button variant="contained" onClick={() => navigate('/listings')} sx={{ mt: 2 }}>
          Back to Listings
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <AppBar position="sticky" sx={{ pt: 1, pb: 1, boxShadow: 'none', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
              onClick={() => navigate('/')}
            >
              <Box component="img" src={logoPng} alt="RentDito Logo" sx={{ height: 40, objectFit: 'contain' }} />
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', ml: 1, letterSpacing: -0.5 }}>
                RentDito
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <IconButton onClick={toggleColorMode} sx={{ color: 'text.secondary' }}>
                {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
              {!isAuthenticated ? (
                <Button variant="contained" color="primary" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => {
                      if (user?.role === 'admin') navigate('/admin');
                      else if (user?.role === 'landlord') navigate('/landlord');
                      else navigate('/tenant');
                    }}
                  >
                    Dashboard
                  </Button>
                  <Button variant="text" color="error" onClick={() => logout()}>
                    Sign Out
                  </Button>
                </>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: 4, flexGrow: 1 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/listings')}
          sx={{ mb: 3, color: 'text.secondary', '&:hover': { bgcolor: 'transparent', color: 'primary.main' } }}
        >
          Back to Listings
        </Button>

        <Grid container spacing={4}>
          <Grid item xs={12} md={7} lg={8}>
            {/* Property Images */}
            <Box sx={{ mb: 4, borderRadius: 4, overflow: 'hidden', boxShadow: 1 }}>
              <ImageCarousel images={property.images} height={400} borderRadius={16} />
            </Box>

            {/* Property Details */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Chip
                    label={property.propertyType}
                    size="small"
                    sx={{ mb: 1.5, bgcolor: 'primary.light', color: 'white', fontWeight: 600, borderRadius: 1 }}
                  />
                  <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
                    {property.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                    <LocationOnOutlined fontSize="small" />
                    <Typography variant="body1">
                      {property.address.street}, {property.address.city}, {property.address.state}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h4" color="primary.main" sx={{ fontWeight: 800 }}>
                    ₱{formatPrice(property.metrics.priceRange.min)} – ₱{formatPrice(property.metrics.priceRange.max)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">per month</Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Description</Typography>
              <Typography variant="body1" color="text.secondary" paragraph sx={{ lineHeight: 1.8 }}>
                {property.description}
              </Typography>

              <Grid container spacing={4} sx={{ mt: 2 }}>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined" sx={{ borderRadius: 3, height: '100%', border: 'none', bgcolor: 'background.default' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Inclusions</Typography>
                      <List dense disablePadding>
                        {property.inclusions.map((item, i) => (
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
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined" sx={{ borderRadius: 3, height: '100%', border: 'none', bgcolor: 'background.default' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Other Details</Typography>
                      <List dense disablePadding>
                        {property.otherDetails.map((item, i) => (
                          <ListItem key={i} disablePadding sx={{ mb: 1 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <InfoOutlined color="primary" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={item} primaryTypographyProps={{ variant: 'body2' }} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </Grid>

          <Grid item xs={12} md={5} lg={4}>
            {/* Contact / Inquiry Card (Sticky) */}
            <Box sx={{ position: 'sticky', top: 100 }}>
              <Card sx={{ borderRadius: 4, p: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Interested?</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Contact the property owner to schedule a viewing or inquire about availability.
                </Typography>
                
                <Button variant="contained" color="primary" fullWidth size="large" sx={{ py: 1.5, mb: 2, borderRadius: 2 }}>
                  Send Inquiry
                </Button>
                <Button variant="outlined" color="primary" fullWidth size="large" sx={{ py: 1.5, borderRadius: 2 }}>
                  Schedule Viewing
                </Button>
                
                <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 2, textAlign: 'center' }}>
                   <Typography variant="caption" color="text.secondary">
                     Or call directly: <br />
                     <Typography component="span" variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>+63 912 345 6789</Typography>
                   </Typography>
                </Box>
              </Card>
            </Box>
          </Grid>
        </Grid>

        {/* ── Units Section ──────────────────────────────────────────────── */}
        <Box sx={{ mt: 6, pt: 6, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Available Units</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {units.length} unit{units.length !== 1 ? 's' : ''} found in this property
          </Typography>

          <Grid container spacing={3}>
            {units.map((unit) => (
              <Grid item xs={12} sm={6} md={4} key={unit.id}>
                <Card sx={{ borderRadius: 4, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <ImageCarousel images={unit.images} height={180} borderRadius={0} />
                  
                  <CardContent sx={{ flexGrow: 1, p: 2.5, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                       <Chip 
                         label={unit.accommodationType} 
                         size="small" 
                         variant="outlined"
                         sx={{ fontWeight: 600, borderRadius: 1 }} 
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

                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>{unit.name}</Typography>

                    <Box sx={{ mb: 2, flexGrow: 1 }}>
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: 'text.secondary' }}>
                         <GroupOutlined fontSize="small" />
                         <Typography variant="body2">Capacity: {unit.capacity} person{unit.capacity > 1 ? 's' : ''}</Typography>
                       </Box>
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                         <MeetingRoomOutlined fontSize="small" />
                         <Typography variant="body2" noWrap sx={{ textOverflow: 'ellipsis' }}>
                           {unit.features.slice(0, 3).join(', ')}
                           {unit.features.length > 3 ? '...' : ''}
                         </Typography>
                       </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                      <Typography variant="h6" color="primary.main" sx={{ fontWeight: 800 }}>
                        ₱{formatPrice(unit.monthlyRent)}<Typography component="span" variant="caption" color="text.secondary">/mo</Typography>
                      </Typography>
                      <Button variant="contained" size="small" sx={{ borderRadius: 2 }} disabled={unit.vacancies === 0}>
                        Inquire
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

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

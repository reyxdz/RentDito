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
  CheckCircleOutline,
  InfoOutlined,
  GroupOutlined,
  Brightness4,
  Brightness7,
  MeetingRoomOutlined,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useColorMode } from '../../context/ThemeContext';
import { useUnitDetail } from '../../../application/hooks/useUnitDetail';
import ImageCarousel from '../../components/ImageCarousel';
import logoPng from '../../../assets/logo.png';

export default function UnitDetailPage() {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const { mode, toggleColorMode } = useColorMode();
  const { unit, loading, error } = useUnitDetail(unitId);

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
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

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
                <Grid size={{ xs: 12, sm: 6 }}>
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
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card variant="outlined" sx={{ borderRadius: 3, height: '100%', border: 'none', bgcolor: 'background.default' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Other Details</Typography>
                      <List dense disablePadding>
                        {unit.otherDetails.map((item, i) => (
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

              <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button 
                  variant="contained" 
                  size="large"
                  disabled={unit.vacancies === 0}
                  sx={{ minWidth: 200 }}
                >
                  Inquire Now
                </Button>
              </Box>
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
    </Box>
  );
}

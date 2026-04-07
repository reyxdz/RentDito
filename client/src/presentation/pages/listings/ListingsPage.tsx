import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Grid,
  TextField,
  InputAdornment,
  Chip,
  MenuItem,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Skeleton,
} from '@mui/material';
import {
  Search,
  LocationOnOutlined,
  MeetingRoomOutlined,
  Brightness4,
  Brightness7,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useColorMode } from '../../context/ThemeContext';
import { useAuth } from '../../../application/context/AuthContext';
import { useListings } from '../../../application/hooks/useListings';
import ImageCarousel from '../../components/ImageCarousel';
import type { PropertyType } from '../../../domain/entities/Property';
import logoPng from '../../../assets/logo.png';

const PROPERTY_TYPES: PropertyType[] = [
  'Boarding House',
  'Apartment',
  'Commercial',
  'Parking',
  'Land',
  'Mixed Use',
];

export default function ListingsPage() {
  const navigate = useNavigate();
  const { mode, toggleColorMode } = useColorMode();
  const { isAuthenticated, user, logout } = useAuth();
  const { properties, loading, error } = useListings();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<PropertyType | 'All'>('All');

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      const q = searchTerm.toLowerCase();
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.address.city.toLowerCase().includes(q) &&
        !p.address.state.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (typeFilter !== 'All' && p.propertyType !== typeFilter) return false;
      return true;
    });
  }, [properties, searchTerm, typeFilter]);

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-PH').format(amount);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <AppBar position="sticky" sx={{ pt: 1, pb: 1 }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
              onClick={() => navigate('/')}
            >
              <Box
                component="img"
                src={logoPng}
                alt="RentDito Logo"
                sx={{ height: 40, objectFit: 'contain' }}
              />
              <Typography
                variant="h5"
                sx={{ fontWeight: 800, color: 'primary.main', ml: 1, letterSpacing: -0.5 }}
              >
                RentDito
              </Typography>
            </Box>

            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 3, alignItems: 'center' }}>
              <Typography
                variant="body2"
                onClick={() => navigate('/listings')}
                sx={{
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: 'primary.main',
                  '&:hover': { color: 'primary.dark' },
                }}
              >
                Properties
              </Typography>
              <Typography
                variant="body2"
                onClick={() => navigate('/')}
                sx={{ fontWeight: 500, cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
              >
                Home
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

      {/* ── Hero / Search Section ──────────────────────────────────────── */}
      <Box
        sx={{
          py: { xs: 5, md: 7 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative blobs */}
        <Box
          sx={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: '45%',
            height: '100%',
            background:
              'radial-gradient(circle, rgba(90,49,232,0.06) 0%, rgba(90,49,232,0) 70%)',
            zIndex: 0,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '-30%',
            left: '-10%',
            width: '50%',
            height: '100%',
            background:
              'radial-gradient(circle, rgba(43,208,248,0.06) 0%, rgba(43,208,248,0) 70%)',
            zIndex: 0,
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              mb: 1,
              fontSize: { xs: '1.8rem', md: '2.5rem' },
            }}
          >
            Browse{' '}
            <Box component="span" sx={{ color: 'primary.main' }}>
              Properties
            </Box>
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600 }}>
            Discover your next home from our curated selection of rental properties across the
            Philippines.
          </Typography>

          {/* Search + Filter bar */}
          <Card
            sx={{
              p: 2,
              bgcolor: 'background.paper',
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 'none',
            }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                  fullWidth
                  placeholder="Search by property name or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                  size="small"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as PropertyType | 'All')}
                  size="small"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                >
                  <MenuItem value="All">All Types</MenuItem>
                  {PROPERTY_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Card>
        </Container>
      </Box>

      {/* ── Property Cards Grid ────────────────────────────────────────── */}
      <Box sx={{ flexGrow: 1, pb: 8 }}>
        <Container maxWidth="lg">
          {loading ? (
            <Grid container spacing={3}>
              {[1, 2, 3].map((i) => (
                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={i}>
                  <Card sx={{ borderRadius: 4, overflow: 'hidden' }}>
                    <Skeleton variant="rectangular" height={220} />
                    <CardContent>
                      <Skeleton width="70%" height={28} />
                      <Skeleton width="50%" height={20} sx={{ mt: 1 }} />
                      <Skeleton width="40%" height={32} sx={{ mt: 2 }} />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : error ? (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <Typography color="error" variant="h6">
                {error}
              </Typography>
            </Box>
          ) : filteredProperties.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <Typography color="text.secondary" variant="h6">
                No properties match your search.
              </Typography>
            </Box>
          ) : (
            <>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 3, fontWeight: 500 }}
              >
                Showing {filteredProperties.length} propert
                {filteredProperties.length === 1 ? 'y' : 'ies'}
              </Typography>

              <Grid container spacing={3}>
                {filteredProperties.map((property) => (
                  <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={property.id}>
                    <Card
                      id={`listing-card-${property.id}`}
                      onClick={() => navigate(`/listings/${property.id}`)}
                      sx={{
                        cursor: 'pointer',
                        borderRadius: 4,
                        overflow: 'hidden',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          transform: 'translateY(-6px)',
                          boxShadow: (theme) =>
                            theme.palette.mode === 'light'
                              ? '0 20px 40px -12px rgba(90, 49, 232, 0.2)'
                              : '0 20px 40px -12px rgba(126, 92, 245, 0.3)',
                        },
                      }}
                    >
                      {/* Carousel */}
                      <ImageCarousel images={property.images} height={220} borderRadius={0} />

                      <CardContent sx={{ p: 2.5 }}>
                        {/* Type badge */}
                        <Chip
                          label={property.propertyType}
                          size="small"
                          sx={{
                            mb: 1.5,
                            bgcolor: 'primary.main',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            borderRadius: 1,
                            letterSpacing: 0.3,
                          }}
                        />

                        {/* Name */}
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 800,
                            mb: 0.5,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {property.name}
                        </Typography>

                        {/* Location */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
                          <LocationOnOutlined
                            sx={{ fontSize: 18, color: 'text.secondary' }}
                          />
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                            {property.address.city}, {property.address.state}
                          </Typography>
                        </Box>

                        {/* Price + Units row */}
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Typography
                            variant="subtitle1"
                            color="primary.main"
                            sx={{ fontWeight: 800 }}
                          >
                            ₱{formatPrice(property.metrics.priceRange.min)} –{' '}
                            ₱{formatPrice(property.metrics.priceRange.max)}
                            <Typography
                              component="span"
                              variant="caption"
                              color="text.secondary"
                              sx={{ ml: 0.5 }}
                            >
                              /mo
                            </Typography>
                          </Typography>

                          <Chip
                            icon={<MeetingRoomOutlined sx={{ fontSize: 16 }} />}
                            label={`${property.metrics.totalUnits} Units`}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: 600,
                              borderColor: 'divider',
                              '& .MuiChip-icon': { color: 'primary.main' },
                            }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Container>
      </Box>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <Box
        component="footer"
        sx={{
          py: 3,
          textAlign: 'center',
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          © {new Date().getFullYear()} RentDito. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
}

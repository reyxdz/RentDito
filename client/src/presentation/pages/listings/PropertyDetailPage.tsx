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
} from '@mui/material';
import {
  ArrowBack,
  LocationOnOutlined,
  CheckCircleOutline,
  GroupOutlined,
  MeetingRoomOutlined,
  InfoOutlined,
  SchoolOutlined,
  StorefrontOutlined,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { usePropertyDetail } from '../../../application/hooks/usePropertyDetail';
import ImageCarousel from '../../components/ImageCarousel';
import Navbar from '../../components/Navbar';

export default function PropertyDetailPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
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
      <Navbar />

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
          <Grid size={{ xs: 12 }}>
            {/* Property Images */}
            <Box sx={{ mb: 4, maxWidth: 1000, mx: 'auto' }}>
              <ImageCarousel images={property.images} height={{ xs: 300, sm: 400, md: 500 }} borderRadius={16} arrowPosition="outside" />
            </Box>

            {/* Property Details */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'flex-start' }, gap: { xs: 1.5, sm: 0 }, mb: 2 }}>
                <Box
                  component="a"
                  href={`https://www.google.com/maps/search/${encodeURIComponent(property.address.street + ' ' + property.address.city)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    textDecoration: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    '&:hover h3': {
                      color: 'primary.main',
                    },
                  }}
                >
                  <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, transition: 'color 0.2s ease' }}>
                    {property.name}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                  <Typography variant="h4" color="primary.main" sx={{ fontWeight: 800 }}>
                    ₱{formatPrice(property.metrics.priceRange.min)} – ₱{formatPrice(property.metrics.priceRange.max)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">per month</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 3, color: 'text.secondary' }}>
                <LocationOnOutlined fontSize="small" />
                <Typography variant="body1">
                  {property.address.street}, {property.address.city},
                </Typography>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Description</Typography>
              <Typography variant="body1" color="text.secondary" paragraph sx={{ lineHeight: 1.8 }}>
                {property.description}
              </Typography>

              <Grid container spacing={4} sx={{ mt: 2 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card variant="outlined" sx={{ borderRadius: 3, height: { xs: 300, md: 500 }, border: 'none', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ pb: 1, flexGrow: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Inclusions</Typography>
                    </CardContent>
                    <CardContent sx={{ 
                      overflow: 'auto', 
                      flexGrow: 1, 
                      pt: 0,
                      '&::-webkit-scrollbar': {
                        width: '8px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: 'transparent',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor: 'primary.main',
                        borderRadius: '4px',
                        border: '2px solid transparent',
                        backgroundClip: 'content-box',
                        '&:hover': {
                          backgroundColor: 'primary.light',
                        },
                      },
                    }}>
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
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card variant="outlined" sx={{ borderRadius: 3, height: { xs: 350, md: 500 }, border: 'none', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ pb: 1, flexGrow: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Nearby Categories</Typography>
                    </CardContent>
                    <CardContent sx={{ 
                      overflow: 'auto', 
                      flexGrow: 1, 
                      pt: 0,
                      '&::-webkit-scrollbar': {
                        width: '8px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: 'transparent',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor: 'primary.main',
                        borderRadius: '4px',
                        border: '2px solid transparent',
                        backgroundClip: 'content-box',
                        '&:hover': {
                          backgroundColor: 'primary.light',
                        },
                      },
                    }}>
                      {property.reviewCenters.length > 0 || property.schools.length > 0 || property.commercialEstablishments.length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                          {/* Review Centers */}
                          {property.reviewCenters.length > 0 && (
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <InfoOutlined sx={{ color: 'primary.main', fontSize: 20 }} />
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                  Review Centers ({property.reviewCenters.length})
                                </Typography>
                              </Box>
                              <List dense disablePadding sx={{ pl: 3.5 }}>
                                {property.reviewCenters.map((venue, i) => (
                                  <ListItem key={i} disablePadding sx={{ mb: 1.5 }}>
                                    <Box sx={{ flex: 1 }}>
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {venue.name}
                                      </Typography>
                                      <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                                        <Typography variant="caption" color="text.secondary">
                                          🚶 {venue.walking}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          🚗 {venue.commute}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </ListItem>
                                ))}
                              </List>
                            </Box>
                          )}

                          {/* Schools */}
                          {property.schools.length > 0 && (
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <SchoolOutlined sx={{ color: 'primary.main', fontSize: 20 }} />
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                  Schools & Universities ({property.schools.length})
                                </Typography>
                              </Box>
                              <List dense disablePadding sx={{ pl: 3.5 }}>
                                {property.schools.map((venue, i) => (
                                  <ListItem key={i} disablePadding sx={{ mb: 1.5 }}>
                                    <Box sx={{ flex: 1 }}>
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {venue.name}
                                      </Typography>
                                      <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                                        <Typography variant="caption" color="text.secondary">
                                          🚶 {venue.walking}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          🚗 {venue.commute}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </ListItem>
                                ))}
                              </List>
                            </Box>
                          )}

                          {/* Commercial Establishments */}
                          {property.commercialEstablishments.length > 0 && (
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <StorefrontOutlined sx={{ color: 'primary.main', fontSize: 20 }} />
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                  Commercial Establishments ({property.commercialEstablishments.length})
                                </Typography>
                              </Box>
                              <List dense disablePadding sx={{ pl: 3.5 }}>
                                {property.commercialEstablishments.map((venue, i) => (
                                  <ListItem key={i} disablePadding sx={{ mb: 1.5 }}>
                                    <Box sx={{ flex: 1 }}>
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {venue.name}
                                      </Typography>
                                      <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                                        <Typography variant="caption" color="text.secondary">
                                          🚶 {venue.walking}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          🚗 {venue.commute}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </ListItem>
                                ))}
                              </List>
                            </Box>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No nearby categories available
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
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
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={unit.id}>
                <Card 
                  sx={{ 
                    borderRadius: 4, 
                    overflow: 'hidden', 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 3,
                    }
                  }}
                  onClick={() => navigate(`/listings/unit/${unit.id}`)}
                >
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
                      <Button 
                        variant="contained" 
                        size="small" 
                        sx={{ borderRadius: 2 }}
                        disabled={unit.vacancies === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/listings/unit/${unit.id}`);
                        }}
                      >
                        View
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

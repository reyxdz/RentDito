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
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Checkbox,
} from '@mui/material';
import {
  Search,
  LocationOnOutlined,
  MeetingRoomOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useListings } from '../../../application/hooks/useListings';
import { useVenueFiltering } from '../../../application/hooks/useVenueFiltering';
import ImageCarousel from '../../components/ImageCarousel';
import Navbar from '../../components/Navbar';
import type { PropertyType } from '../../../domain/entities/Property';
import type { CategoryType, SelectedVenue } from '../../../domain/entities/VenueFilter';

const PROPERTY_TYPES: PropertyType[] = [
  'Boarding House',
  'Apartment',
  'Commercial',
  'Parking',
  'Land',
  'Mixed Use',
];

const PROPERTY_CATEGORIES: { type: CategoryType; label: string }[] = [
  { type: 'reviewCenters', label: 'Review Centers' },
  { type: 'schools', label: 'Schools and Universities' },
  { type: 'commercialEstablishments', label: 'Commercial Establishments' },
];

export default function ListingsPage() {
  const navigate = useNavigate();
  const { properties, loading, error } = useListings();
  const { getUniqueVenuesByCategory, propertyMatchesSelectedVenues, getSelectedVenuesByCategory } =
    useVenueFiltering(properties, selectedVenues);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<PropertyType | 'All'>('All');
  const [selectedVenues, setSelectedVenues] = useState<SelectedVenue[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);

  const handleCategoryClick = (categoryType: CategoryType) => {
    setSelectedCategory(categoryType);
    setModalOpen(true);
  };

  const handleVenueToggle = (venueName: string) => {
    setSelectedVenues((prev) => {
      const venueAlreadySelected = prev.some(
        (v) => v.name === venueName && v.category === selectedCategory
      );

      if (venueAlreadySelected) {
        return prev.filter(
          (v) => !(v.name === venueName && v.category === selectedCategory)
        );
      } else {
        return [...prev, { name: venueName, category: selectedCategory! }];
      }
    });
  };

  const handleClearVenueFilter = (venueToRemove: SelectedVenue) => {
    setSelectedVenues((prev) =>
      prev.filter(
        (v) => !(v.name === venueToRemove.name && v.category === venueToRemove.category)
      )
    );
  };

  const handleClearAllVenues = () => {
    setSelectedVenues([]);
  };

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

      // Venue filter: property must match at least one of the selected venues
      if (!propertyMatchesSelectedVenues(p)) return false;

      return true;
    });
  }, [properties, searchTerm, typeFilter, selectedVenues, propertyMatchesSelectedVenues]);

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-PH').format(amount);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* ── Hero / Search Section ──────────────────────────────────────── */}
      <Box
        sx={{
          py: { xs: 5, md: 7 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
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

            {/* Category Filter */}
            <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Filter by Nearby Categories
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {PROPERTY_CATEGORIES.map((category) => (
                  <Chip
                    key={category.type}
                    label={category.label}
                    onClick={() => handleCategoryClick(category.type)}
                    variant={getSelectedVenuesByCategory(category.type).length > 0 ? 'filled' : 'outlined'}
                    sx={{
                      cursor: 'pointer',
                      fontWeight: 500,
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  />
                ))}
              </Box>

              {/* Selected Venues */}
              {selectedVenues.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      SELECTED ({selectedVenues.length})
                    </Typography>
                    <Button size="small" onClick={handleClearAllVenues} sx={{ textTransform: 'none' }}>
                      Clear All
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {selectedVenues.map((venue, index) => (
                      <Chip
                        key={index}
                        label={venue.name}
                        onDelete={() => handleClearVenueFilter(venue)}
                        size="small"
                        color="primary"
                        variant="filled"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
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

      {/* ── Venue Selection Modal ──────────────────────────────────────── */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedCategory && PROPERTY_CATEGORIES.find((c) => c.type === selectedCategory)?.label}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 0 }}>
          {selectedCategory && getUniqueVenuesByCategory(selectedCategory).length > 0 ? (
            <List>
              {getUniqueVenuesByCategory(selectedCategory).map((venue, index) => {
                const isSelected = getSelectedVenuesByCategory(selectedCategory).some(
                  (v) => v.name === venue.name
                );
                return (
                  <ListItem key={index} disablePadding>
                    <ListItemButton
                      onClick={() => handleVenueToggle(venue.name)}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <ListItemText
                        primary={venue.name}
                        secondary={`${venue.count} propert${venue.count === 1 ? 'y' : 'ies'}`}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="text.secondary">No venues available</Typography>
            </Box>
          )}
        </DialogContent>
        <Divider />
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

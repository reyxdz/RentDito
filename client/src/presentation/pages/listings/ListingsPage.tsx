import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  Collapse,
} from '@mui/material';
import { MeetingRoomOutlined, LocationOnOutlined, TuneOutlined, Search, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useListings } from '../../../application/hooks/useListings';
import { useVenueFiltering } from '../../../application/hooks/useVenueFiltering';
import { useFilterOptions, applyListingFilters } from '../../../application/services/ListingFilterService';
import ImageCarousel from '../../components/ImageCarousel';
import Navbar from '../../components/Navbar';
import FilterPanel from '../../components/FilterPanel';
import type { PropertyType } from '../../../domain/entities/Property';
import type { ListingFilters } from '../../../domain/entities/ListingFilters';
import type { CategoryType, SelectedVenue } from '../../../domain/entities/VenueFilter';

export default function ListingsPage() {
  const navigate = useNavigate();
  const { properties, loading, error } = useListings();
  const filterOptions = useFilterOptions(properties);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  const [filters, setFilters] = useState<ListingFilters>({
    searchTerm: '',
    propertyType: 'All',
    province: 'All',
    city: 'All',
    selectedVenues: [],
  });

  const { getUniqueVenuesByCategory, propertyMatchesSelectedVenues, getSelectedVenuesByCategory } =
    useVenueFiltering(properties, filters.selectedVenues);

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, searchTerm: value }));
  };

  const handlePropertyTypeChange = (value: PropertyType | 'All') => {
    setFilters((prev) => ({ ...prev, propertyType: value }));
  };

  const handleProvinceChange = (value: string | 'All') => {
    setFilters((prev) => ({ ...prev, province: value }));
  };

  const handleCityChange = (value: string | 'All') => {
    setFilters((prev) => ({ ...prev, city: value }));
  };

  const handleVenueToggle = (venueName: string, category: CategoryType) => {
    setFilters((prev) => {
      const venueAlreadySelected = prev.selectedVenues.some(
        (v) => v.name === venueName && v.category === category
      );

      if (venueAlreadySelected) {
        return {
          ...prev,
          selectedVenues: prev.selectedVenues.filter(
            (v) => !(v.name === venueName && v.category === category)
          ),
        };
      } else {
        return {
          ...prev,
          selectedVenues: [
            ...prev.selectedVenues,
            { name: venueName, category },
          ],
        };
      }
    });
  };

  const handleVenueRemove = (venueToRemove: SelectedVenue) => {
    setFilters((prev) => ({
      ...prev,
      selectedVenues: prev.selectedVenues.filter(
        (v) => !(v.name === venueToRemove.name && v.category === venueToRemove.category)
      ),
    }));
  };

  const handleClearAllVenues = () => {
    setFilters((prev) => ({ ...prev, selectedVenues: [] }));
  };

  const filteredProperties = useMemo(() => {
    return applyListingFilters(properties, filters, propertyMatchesSelectedVenues);
  }, [properties, filters, propertyMatchesSelectedVenues]);

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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
            <Box sx={{ flex: 1, mr: { xs: 2, md: 0 } }}>
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
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
                Discover your next home from our curated selection of rental properties across the
                Philippines.
              </Typography>
            </Box>
              <IconButton
                onClick={() => setIsFilterModalOpen(true)}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  display: { xs: 'flex', md: 'none' }, // Only show on mobile
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  mt: 1,
                }}
              >
              <TuneOutlined />
            </IconButton>
          </Box>

          {/* Search Bar */}
          <TextField
            fullWidth
            placeholder="Search by property name or city..."
            value={filters.searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                fontSize: '0.875rem',
              },
              '& .MuiInputBase-input': {
                padding: '10px 12px',
              },
            }}
          />

          {/* Filters Toggle Button (Desktop) */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-end', mt: 1 }}>
            <Button
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              endIcon={isFiltersExpanded ? <ExpandLess /> : <ExpandMore />}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                color: 'text.secondary',
                '&:hover': { bgcolor: 'transparent', color: 'primary.main' },
              }}
              disableRipple
            >
              {isFiltersExpanded ? 'Hide Advanced Filters' : 'Advanced Filters'}
            </Button>
          </Box>

          {/* Inline Filters */}
          <Collapse in={isFiltersExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ mt: 2, display: { xs: 'none', md: 'block' } }}>
              <FilterPanel
                filters={filters}
                filterOptions={filterOptions}
                onSearchChange={handleSearchChange}
                onPropertyTypeChange={handlePropertyTypeChange}
                onProvinceChange={handleProvinceChange}
                onCityChange={handleCityChange}
                onVenueToggle={handleVenueToggle}
                onVenueRemove={handleVenueRemove}
                onClearAllVenues={handleClearAllVenues}
                getUniqueVenuesByCategory={getUniqueVenuesByCategory}
                getSelectedVenuesByCategory={getSelectedVenuesByCategory}
                variant="plain"
                hideSearch={true}
              />
            </Box>
          </Collapse>
        </Container>
      </Box>

      {/* ── Filter Modal Dialog ────────────────────────────────────────── */}
      <Dialog
        open={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: '1.25rem',
            pb: 1,
            pt: { xs: 3, sm: 2 },
          }}
        >
          Filters
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ pt: { xs: 0, sm: 2 } }}>
            <FilterPanel
              filters={filters}
              filterOptions={filterOptions}
              onSearchChange={handleSearchChange}
              onPropertyTypeChange={handlePropertyTypeChange}
              onProvinceChange={handleProvinceChange}
              onCityChange={handleCityChange}
              onVenueToggle={handleVenueToggle}
              onVenueRemove={handleVenueRemove}
              onClearAllVenues={handleClearAllVenues}
              getUniqueVenuesByCategory={getUniqueVenuesByCategory}
              getSelectedVenuesByCategory={getSelectedVenuesByCategory}
              variant="plain"
              hideSearch={true}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setIsFilterModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

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
                        <Box
                          component="a"
                          href={`https://www.google.com/maps/search/${encodeURIComponent(property.address.street + ' ' + property.address.city + ' ' + property.address.state)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            display: 'block',
                            textDecoration: 'none',
                            color: 'inherit',
                            '&:hover h6': {
                              color: 'primary.main',
                            },
                          }}
                        >
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 800,
                              mb: 0.5,
                              lineHeight: 1.3,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                              transition: 'color 0.2s ease',
                            }}
                          >
                            {property.name}
                          </Typography>
                        </Box>

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

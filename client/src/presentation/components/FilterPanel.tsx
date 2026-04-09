import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  MenuItem,
  Chip,
  Card,
  Menu,
  Button,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { useRef, useState } from 'react';
import type { PropertyType } from '../../domain/entities/Property';
import type { ListingFilters, FilterOptions } from '../../domain/entities/ListingFilters';
import type { CategoryType, SelectedVenue } from '../../domain/entities/VenueFilter';

interface FilterPanelProps {
  filters: ListingFilters;
  filterOptions: FilterOptions;
  onSearchChange: (value: string) => void;
  onPropertyTypeChange: (value: PropertyType | 'All') => void;
  onProvinceChange: (value: string | 'All') => void;
  onCityChange: (value: string | 'All') => void;
  onVenueToggle: (venueName: string, category: CategoryType) => void;
  onVenueRemove: (venue: SelectedVenue) => void;
  onClearAllVenues: () => void;
  getUniqueVenuesByCategory: (categoryType: CategoryType) => { name: string; count: number }[];
  getSelectedVenuesByCategory: (categoryType: CategoryType) => SelectedVenue[];
}

export default function FilterPanel({
  filters,
  filterOptions,
  onSearchChange,
  onPropertyTypeChange,
  onProvinceChange,
  onCityChange,
  onVenueToggle,
  onVenueRemove,
  onClearAllVenues,
  getUniqueVenuesByCategory,
  getSelectedVenuesByCategory,
}: FilterPanelProps) {
  // Menu anchor refs for each category
  const anchorRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [openMenu, setOpenMenu] = useState<CategoryType | null>(null);

  const handleMenuOpen = (categoryType: CategoryType, event: React.MouseEvent<HTMLButtonElement>) => {
    anchorRefs.current[categoryType] = event.currentTarget;
    setOpenMenu(categoryType);
  };

  const handleMenuClose = () => {
    setOpenMenu(null);
  };

  const handleVenueSelect = (venueName: string, category: CategoryType) => {
    onVenueToggle(venueName, category);
  };
  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2,
      fontSize: '0.875rem',
    },
    '& .MuiInputBase-input': {
      padding: '10px 12px',
    },
  };

  const sectionSx = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
  };

  return (
    <>
      <Card
        sx={{
          p: 3,
          bgcolor: 'background.paper',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
        }}
      >
        {/* Section 1: Search */}
        <Box sx={sectionSx}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: 0.5, textTransform: 'uppercase', color: 'text.secondary' }}>
            Search
          </Typography>
          <TextField
            fullWidth
            placeholder="Search by property name or city..."
            value={filters.searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            size="small"
            sx={inputSx}
          />
        </Box>

        {/* Section 2: Location & Type */}
        <Box sx={sectionSx}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: 0.5, textTransform: 'uppercase', color: 'text.secondary' }}>
            Location & Type
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
            <TextField
              select
              label="Property Type"
              value={filters.propertyType}
              onChange={(e) => onPropertyTypeChange(e.target.value as PropertyType | 'All')}
              size="small"
              sx={inputSx}
            >
              <MenuItem value="All">All Types</MenuItem>
              {filterOptions.propertyTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Province"
              value={filters.province}
              onChange={(e) => onProvinceChange(e.target.value)}
              size="small"
              sx={inputSx}
            >
              <MenuItem value="All">All Provinces</MenuItem>
              {filterOptions.provinces.map((province) => (
                <MenuItem key={province} value={province}>
                  {province}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="City"
              value={filters.city}
              onChange={(e) => onCityChange(e.target.value)}
              size="small"
              sx={inputSx}
            >
              <MenuItem value="All">All Cities</MenuItem>
              {filterOptions.cities.map((city) => (
                <MenuItem key={city} value={city}>
                  {city}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </Box>

        {/* Section 3: Nearby Categories */}
        <Box sx={sectionSx}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: 0.5, textTransform: 'uppercase', color: 'text.secondary' }}>
            Nearby Categories
          </Typography>

          {/* Category Dropdowns */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {filterOptions.categories.map((category) => {
              const isSelected = getSelectedVenuesByCategory(category.type as CategoryType).length > 0;
              const categoryType = category.type as CategoryType;
              return (
                <Box key={category.type} sx={{ position: 'relative' }}>
                  <Button
                    ref={(el) => {
                      if (el) anchorRefs.current[category.type] = el;
                    }}
                    onClick={(e) => handleMenuOpen(categoryType, e)}
                    variant={isSelected ? 'contained' : 'outlined'}
                    size="small"
                    sx={{
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      borderRadius: 1.5,
                      color: isSelected ? 'white' : 'text.primary',
                      bgcolor: isSelected ? 'primary.main' : 'transparent',
                      border: '1px solid',
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: (theme) =>
                          theme.palette.mode === 'light'
                            ? '0 4px 12px rgba(0, 0, 0, 0.1)'
                            : '0 4px 12px rgba(126, 92, 245, 0.2)',
                      },
                    }}
                  >
                    {category.label}
                  </Button>
                  <Menu
                    anchorEl={anchorRefs.current[category.type]}
                    open={openMenu === categoryType}
                    onClose={handleMenuClose}
                    slotProps={{
                      paper: {
                        sx: {
                          maxHeight: 300,
                          width: 280,
                          mt: 1,
                        },
                      },
                    }}
                  >
                    {getUniqueVenuesByCategory(categoryType).length > 0 ? (
                      getUniqueVenuesByCategory(categoryType).map((venue) => {
                        const isVenueSelected = getSelectedVenuesByCategory(categoryType).some(
                          (v) => v.name === venue.name
                        );
                        return (
                          <MenuItem
                            key={venue.name}
                            onClick={() => handleVenueSelect(venue.name, categoryType)}
                            sx={{ py: 1 }}
                          >
                            <FormControlLabel
                              control={<Checkbox checked={isVenueSelected} size="small" />}
                              label={
                                <Box sx={{ ml: 0.5 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {venue.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {venue.count} propert{venue.count === 1 ? 'y' : 'ies'}
                                  </Typography>
                                </Box>
                              }
                              sx={{ m: 0, width: '100%' }}
                            />
                          </MenuItem>
                        );
                      })
                    ) : (
                      <MenuItem disabled>
                        <Typography variant="body2" color="text.secondary">
                          No venues available
                        </Typography>
                      </MenuItem>
                    )}
                  </Menu>
                </Box>
              );
            })}
          </Box>

          {/* Selected Venues Display */}
          {filters.selectedVenues.length > 0 && (
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem', letterSpacing: 0.5, textTransform: 'uppercase', color: 'text.secondary' }}>
                  Selected Venues ({filters.selectedVenues.length})
                </Typography>
                <Button
                  size="small"
                  onClick={onClearAllVenues}
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.8rem',
                    padding: '4px 8px',
                    color: 'primary.main',
                    '&:hover': {
                      bgcolor: 'rgba(126, 92, 245, 0.08)',
                    },
                  }}
                >
                  Clear All
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {filters.selectedVenues.map((venue, index) => (
                  <Chip
                    key={index}
                    label={venue.name}
                    onDelete={() => onVenueRemove(venue)}
                    size="small"
                    color="primary"
                    variant="filled"
                    sx={{
                      fontSize: '0.8rem',
                      height: 28,
                      borderRadius: 1,
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Card>
    </>
  );
}

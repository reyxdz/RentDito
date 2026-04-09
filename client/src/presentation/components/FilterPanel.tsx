import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  MenuItem,
  Chip,
  Card,
  CardContent,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Checkbox,
} from '@mui/material';
import { Search } from '@mui/icons-material';
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
  onCategoryClick: (categoryType: CategoryType) => void;
  onVenueToggle: (venueName: string) => void;
  onVenueRemove: (venue: SelectedVenue) => void;
  onClearAllVenues: () => void;
  getUniqueVenuesByCategory: (categoryType: CategoryType) => { name: string; count: number }[];
  getSelectedVenuesByCategory: (categoryType: CategoryType) => SelectedVenue[];
  modalOpen: boolean;
  selectedCategory: CategoryType | null;
  onModalOpen: (categoryType: CategoryType) => void;
  onModalClose: () => void;
}

export default function FilterPanel({
  filters,
  filterOptions,
  onSearchChange,
  onPropertyTypeChange,
  onProvinceChange,
  onCityChange,
  onCategoryClick,
  onVenueToggle,
  onVenueRemove,
  onClearAllVenues,
  getUniqueVenuesByCategory,
  getSelectedVenuesByCategory,
  modalOpen,
  selectedCategory,
  onModalOpen,
  onModalClose,
}: FilterPanelProps) {
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
        {/* Search Bar */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search by property name or city..."
            value={filters.searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
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
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Filter Row 1: Property Type, Province, City */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
            Location & Type
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
            <TextField
              select
              size="small"
              label="Property Type"
              value={filters.propertyType}
              onChange={(e) => onPropertyTypeChange(e.target.value as PropertyType | 'All')}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
              size="small"
              label="Province"
              value={filters.province}
              onChange={(e) => onProvinceChange(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
              size="small"
              label="City"
              value={filters.city}
              onChange={(e) => onCityChange(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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

        <Divider sx={{ my: 2 }} />

        {/* Filter Row 2: Nearby Categories */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
            Nearby Categories
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            {filterOptions.categories.map((category) => (
              <Chip
                key={category.type}
                label={category.label}
                onClick={() => onModalOpen(category.type as CategoryType)}
                variant={getSelectedVenuesByCategory(category.type as CategoryType).length > 0 ? 'filled' : 'outlined'}
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

          {/* Selected Venues Display */}
          {filters.selectedVenues.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  SELECTED ({filters.selectedVenues.length})
                </Typography>
                <Button size="small" onClick={onClearAllVenues} sx={{ textTransform: 'none' }}>
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
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Card>

      {/* Venue Selection Modal */}
      <Dialog open={modalOpen} onClose={onModalClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedCategory &&
            filterOptions.categories.find((c) => c.type === selectedCategory)?.label}
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
                      onClick={() => onVenueToggle(venue.name)}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      <Checkbox checked={isSelected} size="small" sx={{ mr: 1 }} />
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
          <Button onClick={onModalClose}>Done</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

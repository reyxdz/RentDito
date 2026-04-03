import { useState } from 'react';
import { 
  Box, Typography, Card, Grid, TextField, InputAdornment, 
  MenuItem, Chip, IconButton, Button, CircularProgress,
  useTheme, CardContent
} from '@mui/material';
import { 
  Search, EditOutlined, DeleteOutline, 
  HomeOutlined, LocationOnOutlined 
} from '@mui/icons-material';
import { useProperties } from '../../../application/hooks/useProperties';
import type { PropertyStatus, PropertyType } from '../../../domain/entities/Property';

const PROPERTY_TYPES: PropertyType[] = [
  'Boarding House', 'Apartment', 'Commercial', 'Parking', 'Land', 'Mixed Use'
];

export default function Properties() {
  const theme = useTheme();
  const { properties, loading, error } = useProperties();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<PropertyType | 'All Types'>('All Types');
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | 'All'>('All');

  const filteredProperties = properties.filter(p => {
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !p.address.city.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (typeFilter !== 'All Types' && p.propertyType !== typeFilter) return false;
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    return true;
  });

  const metrics = {
    total: properties.length,
    active: properties.filter(p => p.status === 'Active').length,
    disabled: properties.filter(p => p.status === 'Disabled').length,
    units: properties.reduce((acc, p) => acc + p.metrics.totalUnits, 0),
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" variant="h6" align="center" sx={{ mt: 4 }}>
        Error loading properties: {error}
      </Typography>
    );
  }

  return (
    <Box sx={{ pb: 4, maxWidth: '100%', overflowX: 'hidden' }}>
      
      {/* Filters Toolbar */}
      <Card sx={{ p: 2, mb: 3, bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
             <TextField
               fullWidth
               placeholder="Search property name or city..."
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
               sx={{
                 '& .MuiOutlinedInput-root': { borderRadius: 2 }
               }}
             />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
             <TextField
               select
               fullWidth
               value={typeFilter}
               onChange={(e) => setTypeFilter(e.target.value as any)}
               size="small"
               sx={{
                 '& .MuiOutlinedInput-root': { borderRadius: 2 }
               }}
             >
               <MenuItem value="All Types">All Types</MenuItem>
               {PROPERTY_TYPES.map(type => (
                 <MenuItem key={type} value={type}>{type}</MenuItem>
               ))}
             </TextField>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', gap: 1, mt: 3, flexWrap: 'wrap' }}>
          {['All', 'Active', 'Disabled'].map((status) => (
            <Chip 
              key={status}
              label={status} 
              onClick={() => setStatusFilter(status as any)}
              sx={{ 
                px: 1,
                bgcolor: statusFilter === status ? 'primary.main' : 'transparent',
                color: statusFilter === status ? 'white' : 'text.secondary',
                border: '1px solid',
                borderColor: statusFilter === status ? 'primary.main' : 'divider',
                fontWeight: statusFilter === status ? 600 : 500,
                '&:hover': {
                  bgcolor: statusFilter === status ? 'primary.dark' : 'action.hover',
                }
              }} 
            />
          ))}
        </Box>
      </Card>

      {/* Metrics Row */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { label: 'TOTAL', value: metrics.total },
          { label: 'ACTIVE', value: metrics.active },
          { label: 'DISABLED', value: metrics.disabled },
          { label: 'UNITS', value: metrics.units },
        ].map((stat, i) => (
          <Grid size={{ xs: 6, sm: 3 }} key={i}>
            <Card sx={{ 
              p: 2.5, borderRadius: 3, bgcolor: 'background.paper', 
              border: '1px solid', borderColor: 'divider', boxShadow: 'none' 
            }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 1 }}>
                {stat.label}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
                {stat.value}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Properties Datagrid / Cards */}
      <Grid container spacing={3}>
        {filteredProperties.length === 0 ? (
           <Grid size={{ xs: 12 }}>
             <Typography color="text.secondary" align="center" sx={{ py: 8 }}>
               No properties match your current filters.
             </Typography>
           </Grid>
        ) : (
          filteredProperties.map(property => (
            <Grid size={{ xs: 12, md: 6, lg: 6, xl: 4 }} key={property.id}>
              <Card sx={{ 
                borderRadius: 3, 
                bgcolor: 'background.paper',
                border: '1px solid', 
                borderColor: 'divider',
                boxShadow: theme.shadows[2],
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8]
                }
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                       <Chip 
                         label={property.propertyType.toUpperCase()} 
                         size="small" 
                         sx={{ 
                           bgcolor: 'action.hover', 
                           color: 'text.primary', 
                           borderRadius: 1,
                           fontWeight: 700,
                           fontSize: '0.7rem',
                           letterSpacing: 0.5
                         }} 
                       />
                       <Chip 
                         label={property.status.toUpperCase()} 
                         size="small" 
                         sx={{ 
                           bgcolor: property.status === 'Active' ? 'primary.main' : 'error.main', 
                           color: 'white', 
                           borderRadius: 1,
                           fontWeight: 700,
                           fontSize: '0.7rem',
                           letterSpacing: 0.5
                         }} 
                       />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                      <IconButton size="small" sx={{ p: 0.5 }} aria-label="edit">
                        <EditOutlined fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" sx={{ p: 0.5 }} aria-label="delete">
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
                    {property.name}
                  </Typography>

                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 6 }}>
                       <Box sx={{ 
                         p: 1.5, borderRadius: 2, 
                         border: '1px solid', borderColor: 'divider',
                         bgcolor: 'background.default'
                       }}>
                         <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 600, mb: 0.5 }}>UNITS</Typography>
                         <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                           <HomeOutlined fontSize="small" color="primary" />
                           <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{property.metrics.totalUnits}</Typography>
                         </Box>
                       </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                       <Box sx={{ 
                         p: 1.5, borderRadius: 2, 
                         border: '1px solid', borderColor: 'divider',
                         bgcolor: 'background.default'
                       }}>
                         <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 600, mb: 0.5 }}>CITY</Typography>
                         <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                           <LocationOnOutlined fontSize="small" color="primary" />
                           <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{property.address.city}</Typography>
                         </Box>
                       </Box>
                    </Grid>
                  </Grid>

                  <Box sx={{ 
                      p: 1.5, borderRadius: 2, 
                      border: '1px solid', borderColor: 'divider',
                      display: 'flex', alignItems: 'center', gap: 1,
                      mb: 3
                   }}>
                     <LocationOnOutlined color="action" fontSize="small" />
                     <Typography variant="caption" color="text.secondary" noWrap sx={{ fontWeight: 500 }}>
                       {property.address.street}, {property.address.city}, {property.address.state}
                     </Typography>
                  </Box>

                  <Button 
                    fullWidth 
                    variant="contained" 
                    color="primary" 
                    disableElevation
                    sx={{ py: 1.5, borderRadius: 2, fontWeight: 700 }}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
}

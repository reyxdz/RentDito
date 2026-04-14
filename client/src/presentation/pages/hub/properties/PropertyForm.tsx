import { useState } from 'react';
import {
  Box, Typography, Stepper, Step, StepLabel, Button, Card, CardContent,
  TextField, Grid, Autocomplete, Chip, useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../application/context/AuthContext';
import { mockPropertyService } from '../../../../infrastructure/services/MockPropertyService';
import VenueEditor from '../../../components/VenueEditor';
import ImageUploader from '../../../components/ImageUploader';
import type { Venue, PropertyType, PropertyStatus } from '../../../../domain/entities/Property';

const steps = ['Basic Info', 'Location', 'Inclusions', 'Nearby Venues', 'Images'];



// Pre-defined list of common amenities for autocomplete
const commonInclusions = [
  'WiFi', 'Air Conditioning', 'CCTV', 'Security Guard', 'Water Included',
  'Electricity Included', 'Parking', 'Gym', 'Swimming Pool', 'Laundry', 'Furnished', 'Cooking Allowed'
];

export default function PropertyForm() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [basicInfo, setBasicInfo] = useState({ name: '', description: '', type: '' as PropertyType });
  const [address, setAddress] = useState({ street: '', city: 'Cebu City', state: 'Cebu', zipCode: '', country: 'Philippines' });
  const [inclusions, setInclusions] = useState<string[]>([]);
  const [venues, setVenues] = useState({
    reviewCenters: [] as Venue[],
    schools: [] as Venue[],
    commercial: [] as Venue[]
  });
  const [images, setImages] = useState<File[]>([]);

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await mockPropertyService.createProperty({
        landlordId: user.id || 'unknown',
        name: basicInfo.name,
        description: basicInfo.description,
        propertyType: basicInfo.type,
        status: 'Active' as PropertyStatus,
        address,
        inclusions,
        reviewCenters: venues.reviewCenters,
        schools: venues.schools,
        commercialEstablishments: venues.commercial,
        images: [], // Images handled differently in real backend
        createdAt: new Date(),
        updatedAt: new Date(),
        id: '', // Will be assigned by backend
        metrics: { totalUnits: 0, activeUnits: 0, vacantUnits: 0, priceRange: { min: 0, max: 0 } },
      } as any);

      navigate('/hub/properties');
    } catch (error) {
      console.error('Failed to create property', error);
      setIsSubmitting(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth label="Property Name"
                value={basicInfo.name}
                onChange={(e) => setBasicInfo({ ...basicInfo, name: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth select label="Property Type"
                value={basicInfo.type}
                onChange={(e) => setBasicInfo({ ...basicInfo, type: e.target.value as PropertyType })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth label="Description" multiline rows={4}
                value={basicInfo.description}
                onChange={(e) => setBasicInfo({ ...basicInfo, description: e.target.value })}
              />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Street Address" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="City" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="State / Province" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Zip / Postal Code" value={address.zipCode} onChange={(e) => setAddress({ ...address, zipCode: e.target.value })} required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Country" value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} required />
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Select or type the amenities, facilities, and rules included in this property.
            </Typography>
            <Autocomplete
              multiple
              freeSolo
              options={commonInclusions}
              value={inclusions}
              onChange={(_, newValue) => setInclusions(newValue)}
              renderTags={(value: readonly string[], getTagProps) =>
                value.map((option: string, index: number) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return <Chip variant="outlined" label={option} key={key} {...tagProps} color="primary" />;
                })
              }
              renderInput={(params) => (
                <TextField {...params} variant="outlined" label="Inclusions & Amenities" placeholder="Press enter to add" />
              )}
            />
          </Box>
        );
      case 3:
        return (
          <Box>
            <VenueEditor
              title="Review Centers"
              description="Add nearby review centers and estimated travel times."
              venues={venues.reviewCenters}
              onChange={(v) => setVenues({ ...venues, reviewCenters: v })}
            />
            <VenueEditor
              title="Educational Institutions"
              description="Add nearby schools, colleges, or universities."
              venues={venues.schools}
              onChange={(v) => setVenues({ ...venues, schools: v })}
            />
            <VenueEditor
              title="Commercial Establishments"
              description="Add nearby malls, markets, or business parks."
              venues={venues.commercial}
              onChange={(v) => setVenues({ ...venues, commercial: v })}
            />
          </Box>
        );
      case 4:
        return (
          <Box>
            <ImageUploader 
              images={images} 
              onChange={setImages} 
              maxFiles={12} 
            />
          </Box>
        );
      default:
        return null;
    }
  };

  const isStepValid = () => {
    if (activeStep === 0) return basicInfo.name.length > 0 && basicInfo.type.length > 0;
    if (activeStep === 1) return address.street.length > 0 && address.city.length > 0;
    return true; // other steps optional
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Add New Property
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Fill out the details below to list your property.
      </Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, mb: 4 }}>
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          {renderStepContent(activeStep)}
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          onClick={activeStep === 0 ? () => navigate('/hub/properties') : handleBack}
          sx={{ fontWeight: 600, color: 'text.secondary' }}
        >
          {activeStep === 0 ? 'Cancel' : 'Back'}
        </Button>
        <Button
          variant="contained"
          onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
          disabled={!isStepValid() || isSubmitting}
          sx={{ fontWeight: 700, minWidth: 120 }}
          disableElevation
        >
          {activeStep === steps.length - 1 ? (isSubmitting ? 'Saving...' : 'Publish Property') : 'Next'}
        </Button>
      </Box>
    </Box>
  );
}

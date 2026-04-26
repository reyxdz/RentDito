import { useState, useEffect } from 'react';
import {
  Box, Typography, Stepper, Step, StepLabel, Button, Card, CardContent,
  TextField, Grid, Autocomplete, Chip, useTheme, MenuItem, Alert, CircularProgress
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../../application/context/AuthContext';
import { useProperties } from '../../../../application/hooks/useProperties';
import { useProperty } from '../../../../application/hooks/useProperty';
import VenueEditor from '../../../components/VenueEditor';
import ImageUploader from '../../../components/ImageUploader';
import { apiClient } from '../../../../infrastructure/api/apiClient';
import { ENDPOINTS } from '../../../../infrastructure/api/endpoints';
import type { Venue, PropertyType, PropertyStatus } from '../../../../domain/entities/Property';

const steps = ['Basic Info', 'Location', 'Inclusions', 'Nearby Venues', 'Images'];

// Pre-defined list of common amenities for autocomplete
const commonInclusions = [
  'WiFi', 'Air Conditioning', 'CCTV', 'Security Guard', 'Water Included',
  'Electricity Included', 'Parking', 'Gym', 'Swimming Pool', 'Laundry', 'Furnished', 'Cooking Allowed'
];

const propertyTypes = ['Boarding House', 'Apartment', 'Commercial', 'Parking', 'Land', 'Mixed Use'];

export default function PropertyForm() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { propertyId } = useParams<{ propertyId?: string }>();
  const { user } = useAuth();
  const { createProperty, updateProperty } = useProperties();

  const isEditMode = Boolean(propertyId);
  const { property: existingProperty, loading: loadingProperty } = useProperty(isEditMode ? propertyId : undefined);

  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Form State
  const [basicInfo, setBasicInfo] = useState({ name: '', description: '', type: '' as PropertyType });
  const [address, setAddress] = useState({ street: '', city: 'Cebu City', province: 'Cebu', zipCode: '', country: 'Philippines' });
  const [inclusions, setInclusions] = useState<string[]>([]);
  const [venues, setVenues] = useState({
    reviewCenters: [] as Venue[],
    schools: [] as Venue[],
    commercial: [] as Venue[]
  });
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [propertyStatus, setPropertyStatus] = useState<PropertyStatus>('Active');

  // Pre-fill form when editing
  useEffect(() => {
    if (isEditMode && existingProperty && !initialized) {
      setBasicInfo({
        name: existingProperty.name || '',
        description: existingProperty.description || '',
        type: existingProperty.propertyType || '' as PropertyType,
      });
      setAddress({
        street: existingProperty.address?.street || '',
        city: existingProperty.address?.city || 'Cebu City',
        province: existingProperty.address?.province || 'Cebu',
        zipCode: existingProperty.address?.zipCode || '',
        country: existingProperty.address?.country || 'Philippines',
      });
      setInclusions(existingProperty.inclusions || []);

      // Map server venue format { name, distance } back to client format { name, walking, commute }
      const mapServerVenues = (venueList: any[] = []): Venue[] =>
        venueList.map(v => ({
          name: v.name || '',
          walking: v.distance || v.walking || '',
          commute: v.commute || '',
        }));

      // Handle venues - they could be in venues.* or directly on the property  
      const v = (existingProperty as any).venues || {};
      setVenues({
        reviewCenters: mapServerVenues(v.reviewCenters || (existingProperty as any).reviewCenters),
        schools: mapServerVenues(v.schools || (existingProperty as any).schools),
        commercial: mapServerVenues(v.commercial || (existingProperty as any).commercialEstablishments),
      });

      setExistingImages(existingProperty.images || []);
      setPropertyStatus((existingProperty.status as PropertyStatus) || 'Active');
      setInitialized(true);
    }
  }, [isEditMode, existingProperty, initialized]);

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // Map venue data from client format { name, walking, commute } to server format { name, distance }
      const mapVenues = (venueList: Venue[]) =>
        venueList.map(v => ({
          name: v.name,
          distance: [v.walking, v.commute].filter(Boolean).join(' / '),
        }));

      const propertyData: any = {
        name: basicInfo.name,
        description: basicInfo.description,
        propertyType: basicInfo.type,
        status: propertyStatus,
        address,
        inclusions,
        venues: {
          reviewCenters: mapVenues(venues.reviewCenters),
          schools: mapVenues(venues.schools),
          commercial: mapVenues(venues.commercial),
        },
      };

      let savedPropertyId: string;

      if (isEditMode && propertyId) {
        // UPDATE existing property
        const updated = await updateProperty(propertyId, propertyData);
        savedPropertyId = updated?.id || propertyId;
      } else {
        // CREATE new property
        propertyData.status = 'Active' as PropertyStatus;
        propertyData.images = [];
        const newProperty = await createProperty(propertyData);
        savedPropertyId = newProperty?.id;
      }

      // Upload new images if any were selected
      if (images.length > 0 && savedPropertyId) {
        try {
          const formData = new FormData();
          images.forEach((file) => {
            formData.append('images', file);
          });
          await apiClient.post(ENDPOINTS.PROPERTIES.IMAGES(savedPropertyId), formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (imgError) {
          console.warn('Property saved but image upload failed:', imgError);
        }
      }

      navigate('/hub/properties');
    } catch (error: any) {
      console.error('Failed to save property', error);
      setSubmitError(error?.message || 'Failed to save property. Please check your inputs and try again.');
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
                InputLabelProps={{ shrink: true }}
                slotProps={{
                  select: {
                    displayEmpty: true,
                    MenuProps: {
                      sx: { zIndex: 99999 }
                    }
                  }
                }}
              >
                <MenuItem value="" disabled sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                  Select Property Type
                </MenuItem>
                {propertyTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {isEditMode && (
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth select label="Property Status"
                  value={propertyStatus}
                  onChange={(e) => setPropertyStatus(e.target.value as PropertyStatus)}
                  helperText="Active properties are visible to tenants. Inactive properties are hidden from public listings."
                >
                  <MenuItem value="Active">Active — Visible in Listings</MenuItem>
                  <MenuItem value="Inactive">Inactive — Hidden from Listings</MenuItem>
                  <MenuItem value="Maintenance">Maintenance</MenuItem>
                </TextField>
              </Grid>
            )}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth label="Description" multiline rows={4}
                value={basicInfo.description}
                onChange={(e) => setBasicInfo({ ...basicInfo, description: e.target.value })}
                required
                helperText={basicInfo.description.length > 0 && basicInfo.description.length < 10 ? 'Description must be at least 10 characters' : ''}
                error={basicInfo.description.length > 0 && basicInfo.description.length < 10}
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
              <TextField fullWidth label="Province" value={address.province} onChange={(e) => setAddress({ ...address, province: e.target.value })} required />
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
            {/* Show existing images in edit mode */}
            {isEditMode && existingImages.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Current Images ({existingImages.length})
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {existingImages.map((img, i) => (
                    <Box
                      key={i}
                      component="img"
                      src={img}
                      alt={`Property ${i + 1}`}
                      sx={{ width: 100, height: 80, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                    />
                  ))}
                </Box>
              </Box>
            )}
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              {isEditMode ? 'Add New Images' : 'Upload Images'}
            </Typography>
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
    if (activeStep === 0) return basicInfo.name.length > 0 && basicInfo.type.length > 0 && basicInfo.description.length >= 10;
    if (activeStep === 1) return address.street.length > 0 && address.city.length > 0 && address.province.length > 0 && address.zipCode.length > 0;
    return true; // other steps optional
  };

  // Show loading spinner while fetching existing property in edit mode
  if (isEditMode && loadingProperty) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        {isEditMode ? 'Edit Property' : 'Add New Property'}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {isEditMode ? 'Update the details of your property.' : 'Fill out the details below to list your property.'}
      </Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {submitError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      )}

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
          {activeStep === steps.length - 1
            ? (isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Publish Property'))
            : 'Next'}
        </Button>
      </Box>
    </Box>
  );
}

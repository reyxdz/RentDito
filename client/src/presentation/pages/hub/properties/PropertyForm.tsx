import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Button, Stepper, Step, StepLabel, 
  Paper, TextField, Grid, Autocomplete, Chip, MenuItem, Divider
} from '@mui/material';
import PageHeader from '../../../components/PageHeader';
import ImageUploader from '../../../components/ImageUploader';
import VenueEditor, { type VenueData } from '../../../components/VenueEditor';

const steps = ['Basic Info', 'Address', 'Inclusions', 'Nearby Venues', 'Images'];
const propertyTypes = ['Boarding House', 'Apartment', 'Studio', 'Dormitory', 'Commercial', 'Parking', 'Land', 'Mixed Use'];

const popularInclusions = ['Free WiFi', 'Water Included', 'Aircon', 'Bunk Beds', 'CCTV', 'Kitchen Access', 'Laundry Area', 'Cleaning Service', 'Gym'];

const PropertyForm: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  // Form State
  const [basicInfo, setBasicInfo] = useState({ name: '', description: '', propertyType: '' });
  const [address, setAddress] = useState({ street: '', city: '', state: '', zipCode: '', country: 'Philippines' });
  const [inclusions, setInclusions] = useState<string[]>([]);
  
  const [reviewCenters, setReviewCenters] = useState<VenueData[]>([]);
  const [schools, setSchools] = useState<VenueData[]>([]);
  const [commercialEstablishments, setCommercialEstablishments] = useState<VenueData[]>([]);
  
  const [images, setImages] = useState<File[]>([]);

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      handleSubmit();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleSubmit = async () => {
    console.log('Submitting form data:', {
      basicInfo, address, inclusions, reviewCenters, schools, commercialEstablishments, images
    });
    // TODO: Wire up actual API submission using PropertyService
    // For now, redirect to property list
    navigate('/hub/properties');
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <TextField 
                required fullWidth label="Property Name" 
                value={basicInfo.name} 
                onChange={e => setBasicInfo({...basicInfo, name: e.target.value})} 
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField 
                select required fullWidth label="Property Type" 
                value={basicInfo.propertyType} 
                onChange={e => setBasicInfo({...basicInfo, propertyType: e.target.value})}
              >
                {propertyTypes.map(pt => <MenuItem key={pt} value={pt}>{pt}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField 
                fullWidth multiline rows={4} label="Description" 
                value={basicInfo.description} 
                onChange={e => setBasicInfo({...basicInfo, description: e.target.value})} 
              />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Street Address" value={address.street} onChange={e => setAddress({...address, street: e.target.value})} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="City" value={address.city} onChange={e => setAddress({...address, city: e.target.value})} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="State / Province" value={address.state} onChange={e => setAddress({...address, state: e.target.value})} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="ZIP Code" value={address.zipCode} onChange={e => setAddress({...address, zipCode: e.target.value})} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Country" value={address.country} onChange={e => setAddress({...address, country: e.target.value})} />
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Box>
            <Typography variant="body1" mb={2} color="text.secondary">
              Select or type the available inclusions and amenities for this property.
            </Typography>
            <Autocomplete
              multiple
              options={popularInclusions}
              freeSolo
              value={inclusions}
              onChange={(_, newValue) => setInclusions(newValue)}
              renderTags={(value: readonly string[], getTagProps) =>
                value.map((option: string, index: number) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return <Chip key={key} variant="outlined" label={option} {...tagProps} />;
                })
              }
              renderInput={(params) => (
                <TextField {...params} variant="outlined" label="Inclusions & Amenities" placeholder="Add inclusion..." />
              )}
            />
          </Box>
        );
      case 3:
        return (
          <Box>
             <Typography variant="body2" mb={3} color="text.secondary">
              Highlighting nearby venues helps tenants assess the property's accessibility and value.
            </Typography>
            <VenueEditor title="Review Centers" venues={reviewCenters} onChange={setReviewCenters} />
            <Divider sx={{ my: 3 }} />
            <VenueEditor title="Schools & Universities" venues={schools} onChange={setSchools} />
            <Divider sx={{ my: 3 }} />
            <VenueEditor title="Commercial Establishments" venues={commercialEstablishments} onChange={setCommercialEstablishments} />
          </Box>
        );
      case 4:
        return (
          <Box>
             <Typography variant="body2" mb={2} color="text.secondary">
              Upload clear, high-quality images of the property. You can drag and drop multiple files.
            </Typography>
            <ImageUploader images={images} onImagesChange={setImages} />
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      <PageHeader
        title="Add New Property"
        subtitle="Create a new property listing with complete details."
        action={
          <Button variant="outlined" onClick={() => navigate('/hub/properties')}>
            Cancel
          </Button>
        }
      />

      <Paper sx={{ p: { xs: 2, md: 4 }, mt: 3, borderRadius: 2 }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ minHeight: '300px', my: 4 }}>
          {renderStepContent(activeStep)}
        </Box>

        <Divider sx={{ mb: 2 }} />
        
        <Box display="flex" justifyContent="space-between">
          <Button disabled={activeStep === 0} onClick={handleBack} variant="outlined">
            Back
          </Button>
          <Button variant="contained" onClick={handleNext}>
            {activeStep === steps.length - 1 ? 'Submit Property' : 'Next Step'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default PropertyForm;

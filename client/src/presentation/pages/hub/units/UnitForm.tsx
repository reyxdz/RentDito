import { useState } from 'react';
import {
  Box, Typography, Stepper, Step, StepLabel, Button, Card, CardContent,
  TextField, Grid, Autocomplete, Chip, useTheme, MenuItem, RadioGroup, FormControlLabel, Radio, FormControl, FormLabel, InputAdornment, Alert
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import ImageUploader from '../../../components/ImageUploader';
import { useProperties } from '../../../../application/hooks/useProperties';
import { useUnits } from '../../../../application/hooks/useUnits';
import { apiClient } from '../../../../infrastructure/api/apiClient';
import { ENDPOINTS } from '../../../../infrastructure/api/endpoints';
import type { AccommodationType } from '../../../../domain/entities/Unit';

const steps = ['Basic Info', 'Pricing & Capacity', 'Features', 'Images'];

const commonFeatures = [
  'Air Conditioning', 'Ceiling Fan', 'Attached Bathroom', 'Balcony',
  'Window', 'Fully Furnished', 'Semi-Furnished', 'Bunk Beds', 'Single Beds'
];

export default function UnitForm() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { unitId } = useParams(); // if edit mode

  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { properties } = useProperties();
  const { createUnit } = useUnits();

  // Form State
  const [basicInfo, setBasicInfo] = useState({
    propertyId: '',
    unitIdentifier: '',
    accommodationType: 'room' as AccommodationType,
    sizeSqm: ''
  });

  const [pricing, setPricing] = useState({
    roomRent: '',
    bedspaceRent: '',
    deposit: '',
    capacity: '1'
  });

  const [features, setFeatures] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // Parse string values to numbers for server validation
      const capacityNum = parseInt(pricing.capacity, 10) || 1;

      const unitParams: any = {
        propertyId: basicInfo.propertyId,
        unitIdentifier: basicInfo.unitIdentifier,
        accommodationType: basicInfo.accommodationType,
        deposit: parseFloat(pricing.deposit) || 0,
        capacity: capacityNum,
        maxOccupants: capacityNum, // derive maxOccupants from capacity
        features,
        images: [],
        status: 'vacant',
      };

      // Add size if provided
      if (basicInfo.sizeSqm) {
        unitParams.sizeSqm = parseFloat(basicInfo.sizeSqm);
      }

      // Add the appropriate rent field based on accommodation type
      if (basicInfo.accommodationType === 'room') {
        unitParams.roomRent = parseFloat(pricing.roomRent) || 0;
      } else {
        unitParams.bedspaceRent = parseFloat(pricing.bedspaceRent) || 0;
      }

      const newUnit = await createUnit(basicInfo.propertyId, unitParams);

      // Upload images if any were selected
      if (images.length > 0 && newUnit?.id) {
        try {
          const formData = new FormData();
          images.forEach((file) => {
            formData.append('images', file);
          });
          await apiClient.post(ENDPOINTS.UNITS.IMAGES(newUnit.id), formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (imgError) {
          console.warn('Unit created but image upload failed:', imgError);
          // Don't block navigation — unit was created successfully
        }
      }

      navigate('/hub/units');
    } catch (error: any) {
      console.error('Failed to create unit', error);
      setSubmitError(error?.message || 'Failed to create unit. Please check your inputs and try again.');
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
                fullWidth select label="Select Property"
                value={basicInfo.propertyId}
                onChange={(e) => setBasicInfo({ ...basicInfo, propertyId: e.target.value })}
                required
                InputLabelProps={{ shrink: true }}
                slotProps={{ select: { displayEmpty: true } }}
              >
                <MenuItem value="" disabled sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                  Choose a Property
                </MenuItem>
                {properties.map((p) => {
                  const propStringId = String(p.id || p._id);
                  return <MenuItem key={propStringId} value={propStringId}>{p.name}</MenuItem>;
                })}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth label="Unit Identifier"
                placeholder="e.g. Room 101, Bedspace A"
                value={basicInfo.unitIdentifier}
                onChange={(e) => setBasicInfo({ ...basicInfo, unitIdentifier: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth label="Size (sqm)"
                type="number"
                value={basicInfo.sizeSqm}
                onChange={(e) => setBasicInfo({ ...basicInfo, sizeSqm: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl component="fieldset" sx={{ mt: 1 }}>
                <FormLabel component="legend">Accommodation Type</FormLabel>
                <RadioGroup
                  row
                  value={basicInfo.accommodationType}
                  onChange={(e) => setBasicInfo({ ...basicInfo, accommodationType: e.target.value as AccommodationType })}
                >
                  <FormControlLabel value="room" control={<Radio />} label="Entire Room" />
                  <FormControlLabel value="bedspace" control={<Radio />} label="Bedspace (Shared)" />
                </RadioGroup>
              </FormControl>
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={3}>
            {basicInfo.accommodationType === 'room' ? (
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth label="Monthly Room Rent"
                  type="number"
                  InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
                  value={pricing.roomRent}
                  onChange={(e) => setPricing({ ...pricing, roomRent: e.target.value })}
                  required
                />
              </Grid>
            ) : (
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth label="Monthly Rent (Per Bedspace)"
                  type="number"
                  InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
                  value={pricing.bedspaceRent}
                  onChange={(e) => setPricing({ ...pricing, bedspaceRent: e.target.value })}
                  required
                />
              </Grid>
            )}

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth label="Security Deposit"
                type="number"
                InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
                value={pricing.deposit}
                onChange={(e) => setPricing({ ...pricing, deposit: e.target.value })}
                required
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth label={basicInfo.accommodationType === 'bedspace' ? "Number of Slots/Beds" : "Max Occupants"}
                type="number"
                value={pricing.capacity}
                onChange={(e) => setPricing({ ...pricing, capacity: e.target.value })}
                required
              />
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Select or type features available inside this specific unit.
            </Typography>
            <Autocomplete
              multiple
              freeSolo
              options={commonFeatures}
              value={features}
              onChange={(_, newValue) => setFeatures(newValue)}
              renderTags={(value: readonly string[], getTagProps) =>
                value.map((option: string, index: number) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return <Chip variant="outlined" label={option} key={key} {...tagProps} color="primary" />;
                })
              }
              renderInput={(params) => (
                <TextField {...params} variant="outlined" label="Unit Features & Furnishings" placeholder="Press enter to add" />
              )}
            />
          </Box>
        );
      case 3:
        return (
          <Box>
            <ImageUploader images={images} onChange={setImages} maxFiles={6} />
          </Box>
        );
      default:
        return null;
    }
  };

  const isStepValid = () => {
    if (activeStep === 0) return basicInfo.propertyId && basicInfo.unitIdentifier;
    if (activeStep === 1) {
      const hasRent = basicInfo.accommodationType === 'room' ? !!pricing.roomRent : !!pricing.bedspaceRent;
      return hasRent && !!pricing.deposit && !!pricing.capacity;
    }
    return true;
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        {unitId ? 'Edit Unit' : 'Add New Unit'}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Fill out the details below to define a room or bedspace configuration.
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
          onClick={activeStep === 0 ? () => navigate('/hub/units') : handleBack}
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
          {activeStep === steps.length - 1 ? (isSubmitting ? 'Saving...' : 'Publish Unit') : 'Next'}
        </Button>
      </Box>
    </Box>
  );
}

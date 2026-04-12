import { Box, Button, Card, Typography, Container, TextField, Alert, CircularProgress, MenuItem } from '@mui/material';
import { useState } from 'react';
import { useAuth } from '../../../application/context/AuthContext';
import { Link as RouterLink } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { Storefront, CloudUpload } from '@mui/icons-material';

export default function BecomeLandlord() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');

  // Required verification check per spec
  if (user?.verificationStatus !== 'verified' && !success) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <PageHeader title="Become a Landlord" />
        <Card sx={{ p: 4, mt: 4, borderRadius: 3, textAlign: 'center' }}>
          <Alert severity="warning" sx={{ mb: 3 }}>
            You must be fully verified before you can apply to become a landlord.
          </Alert>
          <Button component={RouterLink} to="/u/verify" variant="contained">
            Verify Identity Now
          </Button>
        </Card>
      </Container>
    );
  }

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API Delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSuccess(true);
    setIsLoading(false);
  };

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <PageHeader title="Become a Landlord" subtitle="Register your business to start listing properties" />
      
      <Card sx={{ p: 4, mt: 4, borderRadius: 3 }}>
        {success ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Alert severity="success" sx={{ mb: 3 }}>
              Your application has been successfully submitted and is now pending review by our administration team.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              We typically review applications within 24-48 hours. You will receive an email once a decision implies.
            </Typography>
          </Box>
        ) : (
          <form onSubmit={handleApply}>
            <Typography variant="h6" sx={{ mb: 3 }}>Business Details</Typography>
            
            <TextField fullWidth label="Business Name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required disabled={isLoading} sx={{ mb: 3 }} />
            
            <TextField fullWidth select label="Business Type" value={businessType} onChange={(e) => setBusinessType(e.target.value)} required disabled={isLoading} sx={{ mb: 4 }}>
              <MenuItem value="individual">Individual / Sole Proprietorship</MenuItem>
              <MenuItem value="corporation">Corporation</MenuItem>
              <MenuItem value="partnership">Partnership</MenuItem>
            </TextField>

            <Typography variant="h6" sx={{ mb: 2 }}>Required Documents</Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Please upload a copy of your Business Permit or equivalent documentation.
            </Alert>

            <Box sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 2, p: 4, textAlign: 'center', bgcolor: 'background.default', mb: 4, cursor: 'pointer' }}>
              <CloudUpload color="primary" sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="body1">Upload Business Documents</Typography>
            </Box>

            <Button 
              type="submit" 
              variant="contained" 
              size="large" 
              fullWidth 
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <Storefront />}
            >
              {isLoading ? 'Submitting Application...' : 'Submit Landlord Application'}
            </Button>
          </form>
        )}
      </Card>
    </Container>
  );
}

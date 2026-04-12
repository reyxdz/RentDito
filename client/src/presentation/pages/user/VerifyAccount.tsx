import { Box, Button, Card, Typography, Container, Alert, CircularProgress } from '@mui/material';
import { useState } from 'react';
import { useAuth } from '../../../application/context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import { CloudUpload, CheckCircle } from '@mui/icons-material';

export default function VerifyAccount() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'unverified' | 'pending' | 'verified'>(user?.verificationStatus || 'unverified');

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setStatus('pending');
    setIsLoading(false);
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
        Verify Your Identity
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        To keep our community safe, landlords and specific users must be verified.
      </Typography>

      <Card sx={{ p: 4, mt: 4, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Current Status</Typography>
          <StatusBadge status={status} />
        </Box>

        {status === 'verified' && (
          <Alert icon={<CheckCircle fontSize="inherit" />} severity="success" sx={{ mb: 3 }}>
            Your account is fully verified. Thank you!
          </Alert>
        )}

        {status === 'pending' && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Your documents are currently under review by our administration team. This usually takes 1-2 business days.
          </Alert>
        )}

        {status === 'unverified' && (
          <form onSubmit={handleUpload}>
            <Alert severity="warning" sx={{ mb: 4 }}>
              Please upload a clear picture of the front and back of a valid government ID.
            </Alert>

            <Box sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 2, p: 4, textAlign: 'center', bgcolor: 'background.default', mb: 4, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
              <CloudUpload color="primary" sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                Drag & Drop Files Here
              </Typography>
              <Typography variant="caption" color="text.secondary">
                or click to browse local files (Max 5MB each)
              </Typography>
            </Box>

            <Button 
              type="submit" 
              variant="contained" 
              fullWidth 
              size="large"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isLoading ? 'Uploading...' : 'Submit Documents'}
            </Button>
          </form>
        )}
      </Card>
    </Container>
  );
}

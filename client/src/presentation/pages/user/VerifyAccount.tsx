import { Box, Button, Card, Typography, Container, Alert, CircularProgress } from '@mui/material';
import { useState } from 'react';
import { useAuth } from '../../../application/context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import { CloudUpload, CheckCircle } from '@mui/icons-material';

export default function VerifyAccount() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'unverified' | 'pending' | 'verified'>(user?.verificationStatus || 'unverified');
  
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontImage || !backImage) return;
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

            <Box sx={{ display: 'flex', gap: 2, mb: 4, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Box 
                component="label"
                sx={{ flex: 1, border: '2px dashed', borderColor: frontImage ? 'primary.main' : 'divider', borderRadius: 2, p: 3, textAlign: 'center', bgcolor: frontImage ? 'primary.50' : 'background.default', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              >
                <input type="file" hidden accept="image/*" onChange={(e) => setFrontImage(e.target.files?.[0] || null)} />
                <CloudUpload color={frontImage ? "primary" : "action"} sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {frontImage ? frontImage.name : 'Upload Front ID'}
                </Typography>
              </Box>
              
              <Box 
                component="label"
                sx={{ flex: 1, border: '2px dashed', borderColor: backImage ? 'primary.main' : 'divider', borderRadius: 2, p: 3, textAlign: 'center', bgcolor: backImage ? 'primary.50' : 'background.default', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              >
                <input type="file" hidden accept="image/*" onChange={(e) => setBackImage(e.target.files?.[0] || null)} />
                <CloudUpload color={backImage ? "primary" : "action"} sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {backImage ? backImage.name : 'Upload Back ID'}
                </Typography>
              </Box>
            </Box>

            <Button 
              type="submit" 
              variant="contained" 
              fullWidth 
              size="large"
              disabled={isLoading || (!frontImage || !backImage)}
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

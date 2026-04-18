import { useEffect } from 'react';
import { Box, Typography, Paper, Grid, Divider, Button, Skeleton, useTheme } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useContractDetail, useSignContract } from '../../../application/hooks/useContracts';

import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import SignaturePad from '../../components/SignaturePad';
import LockInTracker from '../../components/LockInTracker';
import { ArrowBack, PictureAsPdf, AccountCircle, RealEstateAgent } from '@mui/icons-material';

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
};

export default function ContractView() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const { contract, isLoading, error, fetchContract } = useContractDetail(contractId);
  const { signContract } = useSignContract();

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  useEffect(() => {
    if (error) {
      console.error(error);
    }
  }, [error]);

  const handleSign = async (dataUrl: string) => {
    if (!contractId) return;
    try {
      await signContract(contractId, dataUrl, () => {
        fetchContract(); // Refresh to get active status
      });
    } catch (err) {
      // Error handled by hook Notification
    }
  };

  if (isLoading) {
    return <Box sx={{ p: 3 }}><Skeleton variant="rectangular" height={400} /></Box>;
  }

  if (!contract) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Contract not found.</Typography>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/u/contracts')} sx={{ mt: 2 }}>
          Back to Contracts
        </Button>
      </Box>
    );
  }

  // Calculate generic elapsed months
  const startD = new Date(contract.startDate);
  const currentD = new Date();
  const elapsedMonths = Math.floor((currentD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24 * 30));

  const needsSignature = contract.status === 'pending_signature' && !contract.userSignature;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', pb: 8 }}>
      <Button 
        startIcon={<ArrowBack />} 
        onClick={() => navigate('/u/contracts')} 
        sx={{ mb: 2 }}
        color="inherit"
      >
        Back to My Contracts
      </Button>

      <PageHeader
        title="Contract Details"
        subtitle={`Ref: ${contract.id.toUpperCase()}`}
        action={
          <Button 
            variant="outlined" 
            startIcon={<PictureAsPdf />}
            disabled={contract.status === 'draft' || contract.status === 'pending_review' || contract.status === 'pending_signature'}
            onClick={() => console.info('PDF generation will be implemented in the future.')}
          >
            Download PDF
          </Button>
        }
      />

      <Grid container spacing={3}>
        {/* Left Column - Details */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>Rental Agreement</Typography>
                <Typography variant="body2" color="text.secondary">
                  Property ID: {contract.propertyId} • Unit ID: {contract.unitId}
                </Typography>
              </Box>
              <StatusBadge status={contract.status} />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary" display="block">Term Starts</Typography>
                <Typography variant="body1" fontWeight={500}>{new Date(contract.startDate).toLocaleDateString()}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary" display="block">Term Ends</Typography>
                <Typography variant="body1" fontWeight={500}>{new Date(contract.endDate).toLocaleDateString()}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary" display="block">Monthly Rent</Typography>
                <Typography variant="body1" fontWeight={500} color="primary.main">{formatCurrency(contract.monthlyRent)}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary" display="block">Security Deposit</Typography>
                <Typography variant="body1" fontWeight={500}>{formatCurrency(contract.securityDeposit)}</Typography>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, p: 2, bgcolor: theme.palette.grey[50], borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Additional Terms</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {contract.terms || "Standard terms and conditions apply."}
              </Typography>
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>Signatures</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1, textAlign: 'center' }}>
                    <RealEstateAgent color="disabled" sx={{ mb: 1, fontSize: 32 }} />
                    <Typography variant="caption" display="block" color="text.secondary">Landlord Signature</Typography>
                    {contract.landlordSignature ? (
                      <Typography variant="body2" fontWeight={600} color="success.main">Signed</Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">Pending</Typography>
                    )}
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1, textAlign: 'center' }}>
                    <AccountCircle color="disabled" sx={{ mb: 1, fontSize: 32 }} />
                    <Typography variant="caption" display="block" color="text.secondary">Tenant Signature</Typography>
                    {contract.userSignature ? (
                      <Typography variant="body2" fontWeight={600} color="success.main">Signed</Typography>
                    ) : (
                      <Typography variant="body2" color="error.main">Pending</Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Box>

          </Paper>

          {/* Signature Section */}
          {needsSignature && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>Action Required: Sign Contract</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Please review the terms above carefully. Draw your signature below to agree to the rental contract.
              </Typography>
              <SignaturePad 
                height={180} 
                onSign={handleSign}
              />
            </Box>
          )}

        </Grid>

        {/* Right Column - Sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3 }}>
            <LockInTracker 
              monthsElapsed={elapsedMonths > 0 ? elapsedMonths : 0} 
              monthsTotal={contract.lockInPeriod} 
              startDate={contract.startDate} 
              endDate={contract.endDate} 
            />
          </Paper>

          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Billing Breakdown</Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">Monthly Rent</Typography>
              <Typography variant="body2" fontWeight={500}>{formatCurrency(contract.monthlyRent)}</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2" color="text.secondary">Advance Payment</Typography>
              <Typography variant="body2" fontWeight={500}>{formatCurrency(contract.advancePayment)}</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2" color="text.secondary">Security Deposit</Typography>
              <Typography variant="body2" fontWeight={500}>{formatCurrency(contract.securityDeposit)}</Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="subtitle2">Total Initial Due</Typography>
              <Typography variant="subtitle2" color="primary.main">
                {formatCurrency(contract.advancePayment + contract.securityDeposit)}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

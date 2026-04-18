import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Stepper, Step, StepLabel,
  CircularProgress, Alert, Paper, Grid, IconButton
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Hotel as BedIcon,
  VpnKey as KeyIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTenantDetail } from '../../../../application/hooks/useTenants';
import type { Contract } from '../../../../domain/entities/Contract';

interface CheckInFlowProps {
  open: boolean;
  onClose: () => void;
  contract: Contract;
}

export default function CheckInFlow({ open, onClose, contract }: CheckInFlowProps) {
  const navigate = useNavigate();
  const { confirmCheckIn } = useTenantDetail();
  
  const [activeStep, setActiveStep] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any>(null);

  const unit = contract.application?.unit;
  const isBedspace = unit?.accommodationType === 'bedspace';
  
  const steps = [
    'Confirm Arrival',
    ...(isBedspace ? ['Select Bedspace Slot'] : []),
    'Complete Check-In'
  ];

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleComplete = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await confirmCheckIn(contract.id, selectedSlot || undefined);
      setSuccessData(result);
      setActiveStep(steps.length); // Move to success step
    } catch (err: any) {
      setError(err?.message || 'Failed to complete check-in.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = () => {
    if (successData) {
      // If success, closing means we redirect or just reload
      onClose();
      navigate(`/hub/tenants/${successData.id}`);
    } else {
      setActiveStep(0);
      setSelectedSlot(null);
      setError(null);
      onClose();
    }
  };

  const renderStepContent = (stepIndex: number) => {
    // Determine mapping based on whether bedspace is included
    const actualStep = isBedspace ? stepIndex : stepIndex === 1 ? 2 : stepIndex;

    switch (actualStep) {
      case 0:
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="body1" sx={{ mb: 3 }}>
              You are about to initiate the check-in process for <strong>{contract.application?.personalDetails?.fullName || 'the tenant'}</strong>.
            </Typography>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Make sure the tenant has arrived and the unit condition has been physically verified.
              Once you confirm check-in, the tenancy will be marked as active and billing will commence based on the property settings.
            </Alert>
          </Box>
        );

      case 1: // Only reached if isBedspace
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              As this is a bedspace unit, please assign an available slot to the tenant.
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              {unit?.capacity ? (
                <Grid container spacing={2}>
                  {Array.from({ length: unit.capacity }).map((_, index) => {
                    const slotNum = index + 1;
                    const isOccupied = unit.slots?.some(s => s.slotNumber === slotNum && s.status === 'occupied');
                    return (
                      <Grid size={{ xs: 6, sm: 4 }} key={slotNum}>
                        <Box
                          onClick={() => !isOccupied && setSelectedSlot(slotNum)}
                          sx={{
                            p: 2, borderRadius: 2, border: '2px solid',
                            borderColor: isOccupied ? 'divider' : selectedSlot === slotNum ? '#3b82f6' : 'divider',
                            bgcolor: isOccupied ? 'action.hover' : selectedSlot === slotNum ? '#eff6ff' : 'background.paper',
                            cursor: isOccupied ? 'not-allowed' : 'pointer',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                            transition: 'all 0.2s',
                            '&:hover': {
                              borderColor: !isOccupied && selectedSlot !== slotNum ? '#93c5fd' : undefined
                            }
                          }}
                        >
                          <BedIcon sx={{ color: isOccupied ? 'text.disabled' : selectedSlot === slotNum ? '#3b82f6' : 'text.secondary' }} />
                          <Typography variant="subtitle2" color={isOccupied ? 'text.disabled' : 'text.primary'}>
                            Slot {slotNum}
                          </Typography>
                          {isOccupied && (
                            <Typography variant="caption" color="error.main" fontWeight={600}>
                              Occupied
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              ) : (
                <Alert severity="warning">Unit capacity is not configured properly.</Alert>
              )}
            </Paper>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Review the check-in details before proceeding.
            </Typography>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 2 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Tenant</Typography>
                  <Typography variant="body2" fontWeight={600}>{contract.application?.personalDetails?.fullName || '—'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Unit</Typography>
                  <Typography variant="body2" fontWeight={600}>{unit?.unitIdentifier || '—'} {isBedspace ? `(Slot ${selectedSlot || 'TBD'})` : ''}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Rent</Typography>
                  <Typography variant="body2" fontWeight={600}>₱{contract.monthlyRent.toLocaleString()}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Contract Start</Typography>
                  <Typography variant="body2" fontWeight={600}>{new Date(contract.startDate).toLocaleDateString()}</Typography>
                </Grid>
              </Grid>
            </Paper>
            {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
          </Box>
        );

      default:
        return null;
    }
  };

  const isSuccess = activeStep === steps.length;

  return (
    <Dialog open={open} onClose={() => !actionLoading && handleClose()} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <KeyIcon sx={{ color: '#10b981' }} />
          Check-In Process
        </Box>
        <IconButton onClick={() => !actionLoading && handleClose()} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      
      <DialogContent dividers sx={{ borderBottom: 'none' }}>
        {isSuccess ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: '#10b98120', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              <CheckIcon sx={{ fontSize: 40, color: '#10b981' }} />
            </Box>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>Check-In Successful!</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              The tenancy has been activated and the contract is now live.
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc', display: 'inline-flex', flexDirection: 'column', gap: 1, minWidth: 250 }}>
              <Typography variant="body2"><strong>Tenancy ID:</strong> {successData?.id}</Typography>
              <Typography variant="body2"><strong>Status:</strong> Active</Typography>
            </Paper>
          </Box>
        ) : (
          <>
            <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            {renderStepContent(activeStep)}
          </>
        )}
      </DialogContent>
      
      {!isSuccess && (
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose} disabled={actionLoading} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={handleBack} disabled={activeStep === 0 || actionLoading} sx={{ textTransform: 'none' }}>Back</Button>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleComplete}
              disabled={actionLoading || (isBedspace && !selectedSlot)}
              sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' }, fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
            >
              {actionLoading ? <CircularProgress size={20} color="inherit" /> : 'Complete Check-In'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={isBedspace && activeStep === 1 && !selectedSlot}
              sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
            >
              Next
            </Button>
          )}
        </DialogActions>
      )}

      {isSuccess && (
        <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'center' }}>
          <Button
            variant="contained"
            onClick={handleClose}
            sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', px: 4 }}
          >
            View Tenant Profile
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}

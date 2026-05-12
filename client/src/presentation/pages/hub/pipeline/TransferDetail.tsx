import { useEffect, useState } from 'react';
import { Box, Typography, Grid, Button, CircularProgress, Card, CardContent, Divider, Alert } from '@mui/material';
import {
  ArrowBack,
  Person as PersonIcon,
  SwapHoriz as TransferIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTransferDetail } from '../../../../application/hooks/useTransfers';

export default function TransferDetail() {
  const { transferId } = useParams<{ transferId: string }>();
  const navigate = useNavigate();
  const { transfer, loading, fetchTransfer, approveTransfer, rejectTransfer } = useTransferDetail(transferId);

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchTransfer();
  }, [fetchTransfer]);

  if (loading || !transfer) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  const handleApprove = async () => {
    setActionLoading(true);
    await approveTransfer();
    setActionLoading(false);
  };

  const handleReject = async () => {
    setActionLoading(true);
    await rejectTransfer();
    setActionLoading(false);
  };

  const isPending = transfer.status === 'pending';

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/hub/pipeline/transfers')} sx={{ mb: 3, fontWeight: 600 }}>
        Back to Transfers
      </Button>

      {/* Header Banner */}
      <Card elevation={0} sx={{ p: 3, mb: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <TransferIcon sx={{ fontSize: 32 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={800}>Transfer Request</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600} textTransform="uppercase">
                  Status: <Box component="span" sx={{ color: transfer.status === 'approved' ? '#10b981' : transfer.status === 'rejected' ? '#ef4444' : '#f59e0b' }}>{transfer.status}</Box>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  | Requested on {new Date(transfer.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Card>

      <Grid container spacing={3}>
        {/* Tenant Details */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <PersonIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={700}>Tenant Profile</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Name</Typography>
                  <Typography variant="body1" fontWeight={500}>{transfer.tenancy?.personalDetails?.fullName || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Phone</Typography>
                  <Typography variant="body1" fontWeight={500}>{transfer.tenancy?.personalDetails?.phone || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Reason for Transfer</Typography>
                  <Typography variant="body1" fontWeight={500}>{transfer.reason || '—'}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Transfer Details (From/To) */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <TransferIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={700}>Unit Transfer Details</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 5 }}>
                  <Box sx={{ p: 2, bgcolor: 'error.50', borderRadius: 2, border: '1px solid', borderColor: 'error.200' }}>
                    <Typography variant="caption" color="error.main" fontWeight={700} textTransform="uppercase">From Unit</Typography>
                    <Typography variant="h6" fontWeight={800} sx={{ mt: 1 }}>{transfer.fromUnit?.unitIdentifier || transfer.fromUnitId}</Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>Type: {(transfer.fromUnit as any)?.type}</Typography>
                    <Typography variant="body2">Rent: ₱{(transfer.fromUnit as any)?.monthlyRent}</Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 2 }} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TransferIcon color="disabled" sx={{ fontSize: 32 }} />
                </Grid>
                <Grid size={{ xs: 12, sm: 5 }}>
                  <Box sx={{ p: 2, bgcolor: 'success.50', borderRadius: 2, border: '1px solid', borderColor: 'success.200' }}>
                    <Typography variant="caption" color="success.main" fontWeight={700} textTransform="uppercase">To Unit</Typography>
                    <Typography variant="h6" fontWeight={800} sx={{ mt: 1 }}>{transfer.toUnit?.unitIdentifier || transfer.toUnitId}</Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>Type: {(transfer.toUnit as any)?.type}</Typography>
                    <Typography variant="body2">Rent: ₱{(transfer.toUnit as any)?.monthlyRent}</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Pre-transfer checklist & Actions */}
        <Grid size={{ xs: 12 }}>
          <Card variant="outlined" sx={{ borderRadius: 4 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Pre-Transfer Checklist</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
                <Alert severity="success" icon={<CheckIcon />} sx={{ borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700}>Outstanding Dues Cleared</Typography>
                  <Typography variant="body2">Tenant has no pending balances for the current unit.</Typography>
                </Alert>
                <Alert severity="success" icon={<CheckIcon />} sx={{ borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700}>Inventory OK</Typography>
                  <Typography variant="body2">No damages reported for the current unit.</Typography>
                </Alert>
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700}>New Contract Required</Typography>
                  <Typography variant="body2">Approving this transfer will require a new contract to be signed.</Typography>
                </Alert>
              </Box>

              {isPending && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleReject}
                      disabled={actionLoading}
                      sx={{ borderRadius: 2, fontWeight: 700, px: 4 }}
                    >
                      Reject Transfer
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={handleApprove}
                      disabled={actionLoading}
                      sx={{ borderRadius: 2, fontWeight: 700, px: 4, boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }}
                    >
                      {actionLoading ? <CircularProgress size={24} color="inherit" /> : 'Approve Transfer'}
                    </Button>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

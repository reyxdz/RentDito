import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Divider, Paper, CircularProgress, Grid, useTheme } from '@mui/material';
import { ArrowBack, Receipt as ReceiptIcon, Warning as WarningIcon, FileDownload as DownloadIcon } from '@mui/icons-material';
import { format } from 'date-fns';

import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import UtilityBreakdownTable from '../../components/UtilityBreakdownTable';
import { tenantBillingService } from '../../../infrastructure/services/TenantBillingService';
import { useNotification } from '../../../application/context/NotificationContext';
import type { Bill } from '../../../domain/entities/Bill';

export default function BillDetail() {
  const { billId } = useParams<{ billId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { showNotification } = useNotification();
  
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!billId) return;
      try {
        setLoading(true);
        const data = await tenantBillingService.getBillById(billId);
        setBill(data);
      } catch (error) {
        console.error('Failed to fetch bill details', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [billId]);

  const handleDownloadReceipt = async () => {
    if (!billId) return;
    try {
      await tenantBillingService.downloadReceipt(billId);
    } catch (error) {
      console.error('Failed to download receipt', error);
      showNotification('Failed to download receipt. Please try again.', 'error');
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  if (!bill) {
    return (
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/u/bills')} sx={{ mb: 2 }}>Back to My Bills</Button>
        <Typography color="error">Bill not found or you do not have permission to view it.</Typography>
      </Box>
    );
  }

  const isOverdue = bill.status === 'overdue';

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: { xs: 2, md: 3 }, pb: 10 }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/u/bills')} sx={{ mb: 2 }}>
        Back to My Bills
      </Button>

      <PageHeader
        title={`Invoice for ${format(new Date(bill.billingPeriod.start), 'MMM yyyy')}`}
        subtitle={`Generated on ${format(new Date(bill.createdAt), 'MMM dd, yyyy')} • ID: ${bill.id.substring(0, 8)}`}
        action={
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <StatusBadge status={bill.status} />
            {bill.status === 'paid' && (
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadReceipt}
              >
                Download Receipt
              </Button>
            )}
          </Box>
        }
      />

      {isOverdue && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 2,
            bgcolor: theme.palette.error.light + '20',
            border: `1px solid ${theme.palette.error.main}`,
          }}
        >
          <WarningIcon color="error" sx={{ mt: 0.5 }} />
          <Box>
            <Typography variant="h6" color="error.main" fontWeight={700}>
              This bill is overdue
            </Typography>
            <Typography variant="body2" color="error.dark">
              A late fee may have been applied. Please settle this balance as soon as possible or contact the property management if you need assistance.
            </Typography>
          </Box>
        </Paper>
      )}

      <Grid container spacing={3}>
        {/* Left Col - Breakdown */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <ReceiptIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>Bill Breakdown</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography color="text.secondary">Rent Amount</Typography>
              <Typography fontWeight={500}>₱{bill.rentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Typography>
            </Box>
            
            {bill.utilityAmount > 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="text.secondary">Utility Total</Typography>
                  <Typography fontWeight={500}>₱{bill.utilityAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Typography>
                </Box>
                {bill.utilityBreakdown && (
                  <UtilityBreakdownTable breakdown={bill.utilityBreakdown} notes={bill.notes} />
                )}
              </Box>
            )}

            {bill.penaltyAmount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography color="error.main">Penalty (Late Fee)</Typography>
                <Typography color="error.main" fontWeight={500}>₱{bill.penaltyAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Typography>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography fontWeight={600} variant="h6">Total Amount Due</Typography>
              <Typography fontWeight={700} variant="h6">₱{bill.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Right Col - Summary */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Grid container spacing={3} direction="column">
            <Grid size={12}>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 3, 
                  borderRadius: 3, 
                  bgcolor: isOverdue ? 'error.50' : 'primary.50', 
                  borderColor: isOverdue ? 'error.100' : 'primary.100' 
                }}
              >
                <Typography 
                  variant="subtitle2" 
                  color={isOverdue ? 'error.main' : 'primary.main'} 
                  textTransform="uppercase" 
                  fontWeight={700} 
                  gutterBottom
                >
                  Current Balance
                </Typography>
                <Typography 
                  variant="h3" 
                  fontWeight={800} 
                  color={isOverdue ? 'error.dark' : 'primary.dark'}
                >
                  ₱{bill.balanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Due Date: <strong>{format(new Date(bill.dueDate as string), 'MMM dd, yyyy')}</strong>
                </Typography>
              </Paper>
            </Grid>

            <Grid size={12}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={700} mb={2}>Payment History</Typography>
                {bill.paidAmount === 0 ? (
                  <Typography variant="body2" color="text.secondary">No payments have been recorded yet.</Typography>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>Total Paid</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={600} color="success.main">
                      ₱{bill.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Divider, Paper, CircularProgress, Grid } from '@mui/material';
import { ArrowBack, Payment as PaymentIcon, Receipt as ReceiptIcon } from '@mui/icons-material';
import { format } from 'date-fns';

import PageHeader from '../../../components/PageHeader';
import StatusBadge from '../../../components/StatusBadge';
import UtilityBreakdownTable from '../../../components/UtilityBreakdownTable';
import { useBilling } from '../../../../application/hooks/useBilling';
import RecordPaymentDialog from './RecordPaymentDialog';
import type { Bill } from '../../../../domain/entities/Bill';

export default function BillDetail() {
  const { billId } = useParams<{ billId: string }>();
  const navigate = useNavigate();
  const { getBill, recordPayment } = useBilling();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!billId) return;
      setLoading(true);
      const data = await getBill(billId);
      setBill(data);
      setLoading(false);
    };
    fetchDetail();
  }, [billId, getBill]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  if (!bill) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/hub/billing')} sx={{ mb: 2 }}>Back to Bills</Button>
        <Typography color="error">Bill not found.</Typography>
      </Box>
    );
  }

  const handleRecordPayment = async (data: any) => {
    if (!billId) return;
    const result = await recordPayment(billId, data);
    setBill(result.updatedBill);
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: { xs: 2, md: 3 }, pb: 10 }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/hub/billing')} sx={{ mb: 2 }}>
        Back to Bills
      </Button>

      <PageHeader
        title={`Bill #${bill.id.substring(0, 8)}`}
        subtitle={`Period: ${format(new Date(bill.billingPeriod.start), 'MMM yyyy')} - Due: ${format(new Date(bill.dueDate as string), 'MMM dd, yyyy')}`}
        action={
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <StatusBadge status={bill.status as any} />
            {bill.status !== 'paid' && (
              <Button
                variant="contained"
                startIcon={<PaymentIcon />}
                onClick={() => setPaymentDialogOpen(true)}
              >
                Record Payment
              </Button>
            )}
            <Button variant="outlined" startIcon={<ReceiptIcon />}>
              Generate Receipt
            </Button>
          </Box>
        }
      />

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Left Col - Breakdown */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} mb={3}>Breakdown</Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography color="text.secondary">Rent Amount</Typography>
              <Typography fontWeight={500}>₱{bill.rentAmount.toLocaleString()}</Typography>
            </Box>
            
            {bill.utilityAmount > 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="text.secondary">Utility Total</Typography>
                  <Typography fontWeight={500}>₱{bill.utilityAmount.toLocaleString()}</Typography>
                </Box>
                {bill.utilityBreakdown && (
                  <UtilityBreakdownTable breakdown={bill.utilityBreakdown} notes={bill.notes} />
                )}
              </Box>
            )}

            {bill.penaltyAmount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography color="error.main">Penalty (Late Fee)</Typography>
                <Typography color="error.main" fontWeight={500}>₱{bill.penaltyAmount.toLocaleString()}</Typography>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography fontWeight={600} variant="h6">Total Amount</Typography>
              <Typography fontWeight={700} variant="h6">₱{bill.totalAmount.toLocaleString()}</Typography>
            </Box>
          </Paper>

          {/* Payment History Fake Table since we don't fetch payments separately yet */}
          <Paper variant="outlined" sx={{ p: 3, mt: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>Payment History</Typography>
            {bill.paidAmount === 0 ? (
              <Typography variant="body2" color="text.secondary">No payments have been recorded yet.</Typography>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>Total Paid</Typography>
                </Box>
                <Typography variant="body2" fontWeight={600}>₱{bill.paidAmount.toLocaleString()}</Typography>
              </Box>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Detailed payment logs will appear here.
            </Typography>
          </Paper>
        </Grid>

        {/* Right Col - Summary */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, bgcolor: 'primary.50', borderColor: 'primary.100' }}>
            <Typography variant="subtitle2" color="primary.main" textTransform="uppercase" fontWeight={700} gutterBottom>
              Balance Due
            </Typography>
            <Typography variant="h3" fontWeight={800} color="primary.dark">
              ₱{bill.balanceAmount.toLocaleString()}
            </Typography>
            {bill.status === 'overdue' && (
              <Typography variant="body2" color="error.main" sx={{ mt: 1, fontWeight: 500 }}>
                This bill is overdue. Please follow up with the tenant.
              </Typography>
            )}
          </Paper>

          {bill.notes && (
            <Paper variant="outlined" sx={{ p: 3, mt: 3, borderRadius: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Internal Notes</Typography>
              <Typography variant="body2">{bill.notes}</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      <RecordPaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        bill={bill}
        onSubmit={handleRecordPayment}
      />
    </Box>
  );
}

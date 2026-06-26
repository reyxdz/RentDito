import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Divider,
  useTheme,
  Alert,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Download as DownloadIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { tenantBillingService } from '../../../infrastructure/services/TenantBillingService';
import { useNotification } from '../../../application/context/NotificationContext';
import type { Bill } from '../../../domain/entities/Bill';
import { format } from 'date-fns';

export default function MyBills() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const data = await tenantBillingService.getMyBills();
      setBills(data);
    } catch (error) {
      console.error('Failed to fetch bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await tenantBillingService.downloadReceipt(id);
    } catch (error) {
      console.error('Failed to download receipt', error);
      showNotification('Failed to download receipt. Please try again.', 'error');
    }
  };

  const columns: Column<Bill>[] = [
    {
      id: 'billingPeriod',
      label: 'Period',
      format: (_, row) => {
        const d = new Date(row.billingPeriod.start);
        return format(d, 'MMM yyyy');
      },
    },
    {
      id: 'type',
      label: 'Type',
      format: (val) => (
        <Typography sx={{ textTransform: 'capitalize' }}>{val}</Typography>
      ),
    },
    {
      id: 'dueDate',
      label: 'Due Date',
      format: (val) => format(new Date(val), 'MMM dd, yyyy'),
    },
    {
      id: 'totalAmount',
      label: 'Total',
      format: (val) => `₱${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
    {
      id: 'status',
      label: 'Status',
      format: (val) => <StatusBadge status={val} />,
    },
    {
      id: 'actions',
      label: '',
      align: 'right',
      format: (_, row) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => navigate(`/u/bills/${row.id}`)}
          >
            View
          </Button>
          {row.status === 'paid' && (
            <Button
              size="small"
              variant="text"
              startIcon={<DownloadIcon />}
              onClick={(e) => handleDownloadReceipt(row.id, e)}
            >
              Receipt
            </Button>
          )}
        </Box>
      ),
    },
  ];

  // Outstanding bills are unpaid, partial, or overdue
  const outstandingBills = bills.filter((b) => ['unpaid', 'partial', 'overdue'].includes(b.status));
  const currentBill = outstandingBills.length > 0 ? outstandingBills[0] : null;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <PageHeader
        title="My Bills"
        subtitle="Manage your payments and view billing history"
      />

      {currentBill && (
        <Card
          sx={{
            mb: 4,
            borderRadius: 3,
            border: `1px solid ${currentBill.status === 'overdue' ? theme.palette.error.main : theme.palette.primary.main}`,
            background: currentBill.status === 'overdue' ? theme.palette.error.light + '20' : theme.palette.primary.light + '20',
          }}
          elevation={0}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Grid container spacing={3} alignItems="center">
              <Grid size={{ xs: 12, md: 8 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  {currentBill.status === 'overdue' ? (
                    <WarningIcon color="error" />
                  ) : (
                    <ReceiptIcon color="primary" />
                  )}
                  <Typography variant="h6" fontWeight={700}>
                    {currentBill.status === 'overdue' ? 'Overdue Bill' : 'Current Bill'}
                  </Typography>
                  <StatusBadge status={currentBill.status} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Billing Period: {format(new Date(currentBill.billingPeriod.start), 'MMM yyyy')}
                  <br />
                  Due by: <strong>{format(new Date(currentBill.dueDate), 'MMM dd, yyyy')}</strong>
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                <Typography variant="h4" fontWeight={800} color={currentBill.status === 'overdue' ? 'error.main' : 'primary.main'} sx={{ mb: 2 }}>
                  ₱{Number(currentBill.balanceAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Typography>
                <Button
                  variant="contained"
                  color={currentBill.status === 'overdue' ? 'error' : 'primary'}
                  fullWidth
                  onClick={() => navigate(`/u/bills/${currentBill.id}`)}
                >
                  View details to pay
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {!loading && bills.length > 0 && currentBill && (
        <Divider sx={{ my: 4 }} />
      )}

      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>
          Billing History
        </Typography>
      </Box>

      <DataTable
        columns={columns}
        data={bills}
        loading={loading}
        emptyTitle="No bills found"
        emptyDescription="You do not have any bills generated yet."
      />
    </Box>
  );
}

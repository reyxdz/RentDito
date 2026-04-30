import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Grid, IconButton, Tooltip, TextField, MenuItem } from '@mui/material';
import {
  Visibility as ViewIcon,
  SwapHoriz as TransferIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTransfers } from '../../../../application/hooks/useTransfers';
import DataTable from '../../../components/DataTable';
import type { Column } from '../../../components/DataTable';
import type { TransferRequest, TransferRequestStatus } from '../../../../domain/entities/TransferRequest';

const STATUS_CONFIG: Record<TransferRequestStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: '#f59e0b' },
  approved: { label: 'Approved', color: '#10b981' },
  rejected: { label: 'Rejected', color: '#ef4444' },
  completed: { label: 'Completed', color: '#6366f1' },
};

function formatDate(date?: string | Date): string {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function TransferStatusChip({ status }: { status: TransferRequestStatus }) {
  const config = STATUS_CONFIG[status] || { label: status, color: '#6b7280' };
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.5,
        py: 0.5,
        borderRadius: 2,
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.3px',
        textTransform: 'uppercase',
        color: config.color,
        bgcolor: `${config.color}18`,
        border: `1px solid ${config.color}30`,
      }}
    >
      <Box
        sx={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          bgcolor: config.color,
          boxShadow: `0 0 6px ${config.color}60`,
        }}
      />
      {config.label}
    </Box>
  );
}

export default function TransferList() {
  const navigate = useNavigate();
  const { transfers, loading, fetchTransfers } = useTransfers();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const displayData = useMemo(() => {
    let data = transfers;
    if (selectedStatus !== 'all') {
      data = data.filter(t => t.status === selectedStatus);
    }
    return data;
  }, [transfers, selectedStatus]);

  const statusCounts = useMemo(() => ({
    pending: transfers.filter(a => a.status === 'pending').length,
    approved: transfers.filter(a => a.status === 'approved').length,
    rejected: transfers.filter(a => a.status === 'rejected').length,
    total: transfers.length,
  }), [transfers]);

  const columns: Column<TransferRequest>[] = [
    {
      id: 'tenant',
      label: 'Tenant',
      format: (_: any, row: TransferRequest) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.85rem',
              flexShrink: 0,
            }}
          >
            {row.tenancy?.personalDetails?.fullName.charAt(0).toUpperCase() || 'U'}
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
              {row.tenancy?.personalDetails?.fullName || 'Unknown Tenant'}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'fromUnit',
      label: 'From Unit',
      format: (_: any, row: TransferRequest) => (
        <Typography variant="body2" fontWeight={500}>
          {row.fromUnit?.unitIdentifier || row.fromUnitId}
        </Typography>
      ),
    },
    {
      id: 'toUnit',
      label: 'To Unit',
      format: (_: any, row: TransferRequest) => (
        <Typography variant="body2" fontWeight={500} color="primary.main">
          {row.toUnit?.unitIdentifier || row.toUnitId}
        </Typography>
      ),
    },
    {
      id: 'createdAt',
      label: 'Requested On',
      sortable: true,
      format: (value: string | Date) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(value)}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      format: (value: string) => <TransferStatusChip status={value as TransferRequestStatus} />,
    },
    {
      id: 'actions',
      label: '',
      align: 'right',
      format: (_: any, row: TransferRequest) => (
        <Tooltip title="Review Transfer" arrow>
          <IconButton
            size="small"
            onClick={() => navigate(`/hub/pipeline/transfers/${row.id}`)}
            sx={{
              color: 'primary.main',
              '&:hover': { bgcolor: 'primary.50' },
            }}
          >
            <ViewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
            }}
          >
            <TransferIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={800}>
              Transfer Requests
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Review and manage unit transfer requests from current tenants.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { label: 'Total', value: statusCounts.total, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.08)' },
          { label: 'Pending', value: statusCounts.pending, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' },
          { label: 'Approved', value: statusCounts.approved, color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)' },
          { label: 'Rejected', value: statusCounts.rejected, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)' },
        ].map(stat => (
          <Grid size={{ xs: 6, md: 3 }} key={stat.label}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: stat.bg,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 20px ${stat.color}20`,
                },
              }}
            >
              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {stat.label}
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: stat.color, mt: 0.5 }}>
                {stat.value}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              fullWidth
              label="Status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              size="small"
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Box>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={displayData}
        loading={loading}
        emptyTitle="No Transfers Found"
        emptyDescription="There are currently no unit transfer requests from tenants."
      />
    </Box>
  );
}

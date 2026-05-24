import { useState, useEffect } from 'react';
import { Box, Button, Typography, Alert, CircularProgress } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../../application/context/AuthContext';
import { useTransfers } from '../../../application/hooks/useTransfers';
import type { TransferRequest } from '../../../domain/entities/TransferRequest';

export default function MyTransfers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { transfers, loading, fetchTransfers } = useTransfers();

  const tenancy = user?.activeTenancy as any;
  const tenancyId = typeof tenancy === 'string' ? tenancy : tenancy?._id;

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const columns = [
    {
      key: 'createdAt',
      header: 'Date Requested',
      render: (row: TransferRequest) => format(new Date(row.createdAt), 'MMM dd, yyyy'),
      sortable: true,
    },
    {
      key: 'fromUnit',
      header: 'Current Unit',
      render: (row: TransferRequest) => (
        <Typography variant="body2" fontWeight={600}>
          {row.fromUnit?.unitIdentifier ? `Unit ${row.fromUnit.unitIdentifier}` : row.fromUnitId.slice(-6)}
        </Typography>
      ),
    },
    {
      key: 'toUnit',
      header: 'Target Unit',
      render: (row: TransferRequest) => (
        <Typography variant="body2" fontWeight={600}>
          {row.toUnit?.unitIdentifier ? `Unit ${row.toUnit.unitIdentifier}` : row.toUnitId.slice(-6)}
        </Typography>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row: TransferRequest) => (
        <Typography
          variant="body2"
          sx={{
            maxWidth: 280,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.reason}
        </Typography>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: TransferRequest) => <StatusBadge status={row.status} />,
    },
  ];

  if (!tenancyId) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <PageHeader title="Transfer Requests" />
        <Alert severity="info">You must have an active tenancy to view or submit transfer requests.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <PageHeader
          title="Unit Transfers"
          subtitle="View and manage your requests to transfer to a different room or unit"
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/u/transfers/new')}
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          Request Transfer
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ mb: 4 }}>
          <DataTable
            columns={columns}
            data={transfers}
            keyExtractor={(row) => row.id}
            isLoading={loading}
            searchPlaceholder="Search transfers..."
          />
        </Box>
      )}
    </Box>
  );
}

import { useEffect, useState, useMemo } from 'react';
import { Box, Typography, MenuItem, Grid, TextField, IconButton, Tooltip, Button } from '@mui/material';
import {
  Visibility as ViewIcon,
  Description as ContractIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useContracts } from '../../../../application/hooks/useContracts';
import { useProperties } from '../../../../application/hooks/useProperties';
import DataTable from '../../../components/DataTable';
import type { Column } from '../../../components/DataTable';
import type { Contract, ContractStatus } from '../../../../domain/entities/Contract';

/** Contract status → color config */
const STATUS_CONFIG: Record<ContractStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#6b7280' },
  pending_review: { label: 'Pending Review', color: '#f59e0b' },
  pending_signature: { label: 'Pending Signature', color: '#8b5cf6' },
  signed: { label: 'Signed', color: '#3b82f6' },
  active: { label: 'Active', color: '#10b981' },
  expired: { label: 'Expired', color: '#9ca3af' },
  terminated: { label: 'Terminated', color: '#ef4444' },
};

function formatDate(date?: string | Date): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ContractStatusChip({ status }: { status: ContractStatus }) {
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
      <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: config.color, boxShadow: `0 0 6px ${config.color}60` }} />
      {config.label}
    </Box>
  );
}

/** Lock-in progress bar */
function LockInBar({ startDate, lockInPeriod }: { startDate: string | Date; lockInPeriod: number }) {
  if (!lockInPeriod || !startDate) return <Typography variant="body2" color="text.disabled">—</Typography>;

  const start = new Date(startDate);
  const now = new Date();
  const monthsElapsed = Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth());
  const progress = Math.min(100, (monthsElapsed / lockInPeriod) * 100);
  const remaining = Math.max(0, lockInPeriod - monthsElapsed);

  const barColor = progress >= 90 ? '#ef4444' : progress >= 75 ? '#f59e0b' : '#10b981';

  return (
    <Box sx={{ minWidth: 100 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" fontWeight={600} color="text.secondary">
          {monthsElapsed}/{lockInPeriod} mo
        </Typography>
      </Box>
      <Box sx={{ width: '100%', height: 6, borderRadius: 3, bgcolor: 'action.hover' }}>
        <Box sx={{ width: `${progress}%`, height: '100%', borderRadius: 3, bgcolor: barColor, transition: 'width 0.5s' }} />
      </Box>
    </Box>
  );
}

export default function ContractList() {
  const navigate = useNavigate();
  const { contracts, loading: contractsLoading, fetchContracts } = useContracts();
  const { properties, loading: propsLoading } = useProperties();

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    const filters: { status?: string; propertyId?: string } = {};
    if (selectedStatus !== 'all') filters.status = selectedStatus;
    if (selectedPropertyId !== 'all') filters.propertyId = selectedPropertyId;
    fetchContracts(filters);
  }, [selectedPropertyId, selectedStatus, fetchContracts]);

  const displayData = useMemo(() => {
    return contracts.map(c => ({
      ...c,
      id: (c as any)._id || c.id,
    }));
  }, [contracts]);

  const getTenantName = (c: Contract) => {
    const app = c.application as any;
    if (app?.personalDetails?.fullName) return app.personalDetails.fullName;
    if (app?.user?.name) return app.user.name;
    return 'Unknown Tenant';
  };

  const getPropertyName = (c: Contract) => {
    const app = c.application as any;
    if (app?.property?.name) return app.property.name;
    const propId = c.propertyId;
    return properties.find(p => p.id === propId)?.name || 'Unknown';
  };

  const getUnitName = (c: Contract) => {
    const app = c.application as any;
    if (app?.unit?.unitIdentifier) return app.unit.unitIdentifier;
    return '—';
  };

  // Summary stats
  const statusCounts = useMemo(() => ({
    total: contracts.length,
    draft: contracts.filter(c => c.status === 'draft' || c.status === 'pending_review').length,
    pending: contracts.filter(c => c.status === 'pending_signature').length,
    active: contracts.filter(c => c.status === 'active' || c.status === 'signed').length,
  }), [contracts]);

  const columns: Column<Contract & { id: string }>[] = [
    {
      id: 'applicationId',
      label: 'Tenant',
      format: (_: any, row: Contract) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
            }}
          >
            {getTenantName(row).charAt(0).toUpperCase()}
          </Box>
          <Typography variant="subtitle2" fontWeight={600}>{getTenantName(row)}</Typography>
        </Box>
      ),
    },
    {
      id: 'propertyId',
      label: 'Property',
      format: (_: any, row: Contract) => (
        <Typography variant="body2" fontWeight={500}>{getPropertyName(row)}</Typography>
      ),
    },
    {
      id: 'unitId',
      label: 'Unit',
      format: (_: any, row: Contract) => (
        <Typography variant="body2" color="text.secondary">{getUnitName(row)}</Typography>
      ),
    },
    {
      id: 'startDate',
      label: 'Dates',
      format: (_: any, row: Contract) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>{formatDate(row.startDate)}</Typography>
          <Typography variant="caption" color="text.secondary">to {formatDate(row.endDate)}</Typography>
        </Box>
      ),
    },
    {
      id: 'lockInPeriod',
      label: 'Lock-In',
      format: (_: any, row: Contract) => (
        <LockInBar startDate={row.startDate} lockInPeriod={row.lockInPeriod} />
      ),
    },
    {
      id: 'status',
      label: 'Status',
      format: (value: string) => <ContractStatusChip status={value as ContractStatus} />,
    },
    {
      id: 'actions',
      label: '',
      align: 'right',
      format: (_: any, row: Contract & { id: string }) => (
        <Tooltip title="View Contract" arrow>
          <IconButton
            size="small"
            onClick={() => navigate(`/hub/contracts/${row.id}`)}
            sx={{ color: 'primary.main', '&:hover': { bgcolor: 'primary.50' } }}
          >
            <ViewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  const isLoading = contractsLoading || propsLoading;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 48, height: 48, borderRadius: 3,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
            }}
          >
            <ContractIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={800}>Contracts</Typography>
            <Typography variant="body1" color="text.secondary">
              Manage rental contracts, signatures, and lease agreements.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { label: 'Total', value: statusCounts.total, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.08)' },
          { label: 'Drafts', value: statusCounts.draft, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' },
          { label: 'Awaiting Signature', value: statusCounts.pending, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)' },
          { label: 'Active', value: statusCounts.active, color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)' },
        ].map(stat => (
          <Grid size={{ xs: 6, md: 3 }} key={stat.label}>
            <Box
              sx={{
                p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider',
                bgcolor: stat.bg, transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 20px ${stat.color}20` },
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
            <TextField select fullWidth label="Property" value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)} size="small"
            >
              <MenuItem value="all">All Properties</MenuItem>
              {properties.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField select fullWidth label="Status" value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)} size="small"
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="pending_review">Pending Review</MenuItem>
              <MenuItem value="pending_signature">Pending Signature</MenuItem>
              <MenuItem value="signed">Signed</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="expired">Expired</MenuItem>
              <MenuItem value="terminated">Terminated</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Box>

      <DataTable
        columns={columns}
        data={displayData}
        loading={isLoading}
        emptyTitle="No Contracts Found"
        emptyDescription="Contracts are created from approved applications. Approve an application to generate a contract."
      />
    </Box>
  );
}

import { useEffect, useState, useMemo } from 'react';
import { Box, Typography, MenuItem, Grid, TextField, IconButton, Tooltip } from '@mui/material';
import {
  Visibility as ViewIcon,
  Description as AppIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useApplications } from '../../../../application/hooks/useApplications';
import { useProperties } from '../../../../application/hooks/useProperties';
import DataTable from '../../../components/DataTable';
import type { Column } from '../../../components/DataTable';
import type { RentalApplication, ApplicationStatus } from '../../../../domain/entities/RentalApplication';

/** Application status → color config */
const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: '#f59e0b' },
  under_review: { label: 'Under Review', color: '#6366f1' },
  approved: { label: 'Approved', color: '#10b981' },
  rejected: { label: 'Rejected', color: '#ef4444' },
};

function formatDate(date?: string | Date): string {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Custom colored status chip for applications */
function AppStatusChip({ status }: { status: ApplicationStatus }) {
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

export default function ApplicationList() {
  const navigate = useNavigate();
  const { applications, loading: appsLoading, fetchApplications } = useApplications();
  const { properties, loading: propsLoading } = useProperties();

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Fetch applications when filters change
  useEffect(() => {
    const filters: { status?: string; propertyId?: string } = {};
    if (selectedStatus !== 'all') filters.status = selectedStatus;
    if (selectedPropertyId !== 'all') filters.propertyId = selectedPropertyId;
    fetchApplications(filters);
  }, [selectedPropertyId, selectedStatus, fetchApplications]);

  const displayData = useMemo(() => {
    return applications.map(app => ({
      ...app,
      id: (app as any)._id || app.id,
    }));
  }, [applications]);

  const getPropertyName = (app: RentalApplication) => {
    if (app.property) return (app.property as any).name || 'Unknown';
    const propId = typeof app.propertyId === 'string' ? app.propertyId : (app.propertyId as any)?._id;
    return properties.find(p => p.id === propId)?.name || 'Unknown';
  };

  const getApplicantName = (app: RentalApplication) => {
    if (app.personalDetails?.fullName) return app.personalDetails.fullName;
    if (app.user) return (app.user as any).name || 'Unknown';
    return 'Unknown Applicant';
  };

  const getUnitName = (app: RentalApplication) => {
    if (app.unit) return (app.unit as any).unitIdentifier || '—';
    return '—';
  };

  // Summary stat counts
  const statusCounts = useMemo(() => ({
    pending: applications.filter(a => a.status === 'pending').length,
    under_review: applications.filter(a => a.status === 'under_review').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    total: applications.length,
  }), [applications]);

  const columns: Column<RentalApplication & { id: string }>[] = [
    {
      id: 'userId',
      label: 'Applicant',
      format: (_: any, row: RentalApplication) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.85rem',
              flexShrink: 0,
            }}
          >
            {getApplicantName(row).charAt(0).toUpperCase()}
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
              {getApplicantName(row)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.personalDetails?.occupation || (row.user as any)?.email || ''}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'propertyId',
      label: 'Property',
      format: (_: any, row: RentalApplication) => (
        <Typography variant="body2" fontWeight={500}>
          {getPropertyName(row)}
        </Typography>
      ),
    },
    {
      id: 'unitId',
      label: 'Unit',
      format: (_: any, row: RentalApplication) => (
        <Typography variant="body2" color="text.secondary">
          {getUnitName(row)}
        </Typography>
      ),
    },
    {
      id: 'createdAt',
      label: 'Date Applied',
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
      format: (value: string) => <AppStatusChip status={value as ApplicationStatus} />,
    },
    {
      id: 'actions',
      label: '',
      align: 'right',
      format: (_: any, row: RentalApplication & { id: string }) => (
        <Tooltip title="Review Application" arrow>
          <IconButton
            size="small"
            onClick={() => navigate(`/hub/pipeline/applications/${row.id}`)}
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

  const isLoading = appsLoading || propsLoading;

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
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
            }}
          >
            <AppIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={800}>
              Rental Applications
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Review and process rental applications from prospective tenants.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { label: 'Total', value: statusCounts.total, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.08)' },
          { label: 'Pending', value: statusCounts.pending, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' },
          { label: 'Under Review', value: statusCounts.under_review, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)' },
          { label: 'Approved', value: statusCounts.approved, color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)' },
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
              label="Property"
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              size="small"
            >
              <MenuItem value="all">All Properties</MenuItem>
              {properties.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
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
              <MenuItem value="under_review">Under Review</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Box>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={displayData}
        loading={isLoading}
        emptyTitle="No Applications Found"
        emptyDescription="Once prospective tenants submit rental applications, they'll appear here for review."
      />
    </Box>
  );
}

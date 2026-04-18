import { useEffect, useState, useMemo } from 'react';
import { Box, Typography, MenuItem, Grid, TextField, IconButton, Tooltip } from '@mui/material';
import { Visibility as ViewIcon, MailOutline as InboxIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useInquiries } from '../../../../application/hooks/useInquiries';
import { useProperties } from '../../../../application/hooks/useProperties';
import DataTable from '../../../components/DataTable';
import type { Column } from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';

type MockInquiry = any;

/** Helper to format relative dates */
function formatRelativeDate(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Map inquiry status to a display-friendly label */
function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pending',
    responded: 'Responded',
    resolved: 'Resolved',
    open: 'Open',
    in_progress: 'In Progress',
    closed: 'Closed',
    converted: 'Converted',
  };
  return map[status] || status;
}

export default function InquiryList() {
  const navigate = useNavigate();
  const { inquiries, loading: inquiriesLoading, fetchInquiries } = useInquiries();
  const { properties, loading: propsLoading } = useProperties();

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Fetch inquiries on mount
  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  // Client-side filtering
  const displayData = useMemo(() => {
    let data = inquiries as MockInquiry[];

    // Filter by property
    if (selectedPropertyId !== 'all') {
      data = data.filter((inq: MockInquiry) => inq.propertyId === selectedPropertyId);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      data = data.filter((inq: MockInquiry) => inq.status === selectedStatus);
    }

    // Normalize IDs for DataTable
    return data.map((inq: MockInquiry) => ({
      ...inq,
      id: inq._id || inq.id,
    }));
  }, [inquiries, selectedPropertyId, selectedStatus]);

  const columns: Column<any>[] = [
    {
      id: 'userName',
      label: 'Inquirer',
      format: (_: any, row: MockInquiry) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.85rem',
              flexShrink: 0,
            }}
          >
            {(row.userName || 'U').charAt(0).toUpperCase()}
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
              {row.userName || 'Unknown'}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'propertyName',
      label: 'Property',
      format: (value: string) => (
        <Typography variant="body2" fontWeight={500}>
          {value || 'Unknown'}
        </Typography>
      ),
    },
    {
      id: 'unitIdentifier',
      label: 'Unit',
      format: (value: string) => (
        <Typography variant="body2" color="text.secondary">
          {value || '—'}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      format: (value: string) => <StatusBadge status={getStatusLabel(value)} />,
    },
    {
      id: 'createdAt',
      label: 'Date',
      sortable: true,
      format: (value: string | Date) => (
        <Typography variant="body2" color="text.secondary">
          {formatRelativeDate(value)}
        </Typography>
      ),
    },
    {
      id: 'actions',
      label: '',
      align: 'right',
      format: (_: any, row: any) => (
        <Tooltip title="View Conversation" arrow>
          <IconButton
            size="small"
            onClick={() => navigate(`/hub/pipeline/inquiries/${row.id}`)}
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

  const isLoading = inquiriesLoading || propsLoading;

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
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
            }}
          >
            <InboxIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={800}>
              Inquiry Inbox
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage and respond to tenant inquiries across your properties.
            </Typography>
          </Box>
        </Box>
      </Box>

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
              <MenuItem value="responded">Responded</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Box>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={displayData as any}
        loading={isLoading}
        emptyTitle="No Inquiries Found"
        emptyDescription="Once tenants submit inquiries about your properties, they'll appear here."
      />
    </Box>
  );
}

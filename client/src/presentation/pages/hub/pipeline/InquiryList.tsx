import { useEffect, useState, useMemo } from 'react';
import { Box, Typography, MenuItem, Grid, TextField, IconButton, Tooltip } from '@mui/material';
import { Visibility as ViewIcon, MailOutline as InboxIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useInquiries } from '../../../../application/hooks/useInquiries';
import { useProperties } from '../../../../application/hooks/useProperties';
import DataTable from '../../../components/DataTable';
import type { Column } from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import type { Inquiry, InquiryStatus } from '../../../../domain/entities/Inquiry';

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
function getStatusLabel(status: InquiryStatus): string {
  const map: Record<InquiryStatus, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    closed: 'Closed',
    converted: 'Converted',
  };
  return map[status] || status;
}

export default function InquiryList() {
  const navigate = useNavigate();
  const { inquiries, loading: inquiriesLoading, fetchPropertyInquiries } = useInquiries();
  const { properties, loading: propsLoading } = useProperties();

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [fetchingAll, setFetchingAll] = useState(false);
  const [allInquiries, setAllInquiries] = useState<Inquiry[]>([]);

  // Fetch inquiries when property filter changes
  useEffect(() => {
    if (propsLoading || properties.length === 0) return;

    if (selectedPropertyId !== 'all') {
      fetchPropertyInquiries(selectedPropertyId, selectedStatus !== 'all' ? { status: selectedStatus } : undefined);
    } else {
      fetchAllInquiries();
    }
  }, [selectedPropertyId, selectedStatus, properties, propsLoading]);

  // Merge inquiries from all properties when "all" is selected
  const fetchAllInquiries = async () => {
    setFetchingAll(true);
    try {
      const results = await Promise.all(
        properties.map(p =>
          fetchPropertyInquiries(p.id, selectedStatus !== 'all' ? { status: selectedStatus } : undefined).catch(() => [])
        )
      );
      const merged = results.flat();
      // De-duplicate (in case) & sort by newest
      const uniqueMap = new Map<string, Inquiry>();
      merged.forEach(inq => {
        const id = (inq as any)._id || inq.id;
        if (!uniqueMap.has(id)) uniqueMap.set(id, inq);
      });
      const unique = Array.from(uniqueMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setAllInquiries(unique);
    } finally {
      setFetchingAll(false);
    }
  };

  // Decide which data to display
  const displayData = useMemo(() => {
    const data = selectedPropertyId === 'all' ? allInquiries : inquiries;
    // Normalize IDs for DataTable (needs `id` field)
    return data.map(inq => ({
      ...inq,
      id: (inq as any)._id || inq.id,
    }));
  }, [selectedPropertyId, allInquiries, inquiries]);

  const getPropertyName = (inq: Inquiry) => {
    if (inq.property) return (inq.property as any).name || 'Unknown';
    const propId = typeof inq.propertyId === 'string' ? inq.propertyId : (inq.propertyId as any)?._id;
    return properties.find(p => p.id === propId)?.name || 'Unknown';
  };

  const getUserName = (inq: Inquiry) => {
    if (inq.user) return (inq.user as any).name || 'Unknown User';
    return 'Unknown User';
  };

  const getUnitName = (inq: Inquiry) => {
    if (inq.unit) return (inq.unit as any).unitIdentifier || '—';
    return '—';
  };

  const columns: Column<Inquiry & { id: string }>[] = [
    {
      id: 'userId',
      label: 'Inquirer',
      format: (_: any, row: Inquiry) => (
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
            {getUserName(row).charAt(0).toUpperCase()}
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
              {getUserName(row)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {(row.user as any)?.email || ''}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'propertyId',
      label: 'Property',
      format: (_: any, row: Inquiry) => (
        <Typography variant="body2" fontWeight={500}>
          {getPropertyName(row)}
        </Typography>
      ),
    },
    {
      id: 'unitId',
      label: 'Unit',
      format: (_: any, row: Inquiry) => (
        <Typography variant="body2" color="text.secondary">
          {getUnitName(row)}
        </Typography>
      ),
    },
    {
      id: 'subject',
      label: 'Subject',
      format: (value: string) => (
        <Typography
          variant="body2"
          fontWeight={500}
          sx={{
            maxWidth: 220,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {value}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      format: (value: string) => <StatusBadge status={getStatusLabel(value as InquiryStatus)} />,
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
      format: (_: any, row: Inquiry & { id: string }) => (
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

  const isLoading = inquiriesLoading || propsLoading || fetchingAll;

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
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
              <MenuItem value="converted">Converted</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Box>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={displayData}
        loading={isLoading}
        emptyTitle="No Inquiries Found"
        emptyDescription="Once tenants submit inquiries about your properties, they'll appear here."
      />
    </Box>
  );
}

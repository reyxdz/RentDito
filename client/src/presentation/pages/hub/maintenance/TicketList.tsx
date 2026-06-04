import { useEffect, useState, useMemo } from 'react';
import { Box, Typography, MenuItem, Grid, TextField, IconButton, Tooltip, Chip } from '@mui/material';
import { Visibility as ViewIcon, BuildCircle as MaintenanceIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../../../../application/hooks/useTickets';
import { useProperties } from '../../../../application/hooks/useProperties';
import DataTable from '../../../components/DataTable';
import type { Column } from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import type { Ticket, TicketPriority } from '../../../../domain/entities/Ticket';
import { formatRelativeDate } from '../../../../infrastructure/utils/formatRelativeDate';


/** Map ticket status to a display-friendly label */
function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    open: 'Open',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed'
  };
  return map[status] || status;
}

function getPriorityColor(priority: TicketPriority): string {
  switch (priority) {
    case 'low': return '#4caf50';
    case 'medium': return '#ff9800';
    case 'high': return '#f44336';
    case 'urgent': return '#d32f2f';
    default: return '#757575';
  }
}

export default function TicketList() {
  const navigate = useNavigate();
  const { tickets, loading: ticketsLoading, fetchTickets } = useTickets();
  const { properties, loading: propsLoading } = useProperties();

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Pre-compute a Map for O(1) property lookups instead of O(n) Array.find per row
  const propertyMap = useMemo(() => {
    const map = new Map<string, string>();
    properties.forEach(p => map.set(p.id, p.name));
    return map;
  }, [properties]);

  const displayData = useMemo(() => {
    let data = tickets;

    if (selectedPropertyId !== 'all') {
      data = data.filter((t) => t.propertyId === selectedPropertyId);
    }
    if (selectedStatus !== 'all') {
      data = data.filter((t) => t.status === selectedStatus);
    }
    if (selectedPriority !== 'all') {
      data = data.filter((t) => t.priority === selectedPriority);
    }
    if (selectedCategory !== 'all') {
      data = data.filter((t) => t.category === selectedCategory);
    }

    return data;
  }, [tickets, selectedPropertyId, selectedStatus, selectedPriority, selectedCategory]);

  const columns: Column<Ticket>[] = [
    {
      id: 'title',
      label: 'Issue',
      format: (value: string, row: Ticket) => (
         <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
              {value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              By {row.reportedByUser?.name}
            </Typography>
         </Box>
      ),
    },
    {
      id: 'propertyId',
      label: 'Location',
      format: (_: any, row: Ticket) => {
         return (
            <Box>
               <Typography variant="body2" fontWeight={500}>
                  {propertyMap.get(row.propertyId) || 'Unknown Property'}
               </Typography>
               <Typography variant="caption" color="text.secondary">
                  Unit: {row.unitId}
               </Typography>
            </Box>
         );
      },
    },
    {
      id: 'category',
      label: 'Category',
      format: (value: string) => (
        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
          {value.replace('_', ' ')}
        </Typography>
      ),
    },
    {
      id: 'priority',
      label: 'Priority',
      format: (value: TicketPriority) => (
        <Chip
          label={value.toUpperCase()}
          size="small"
          sx={{
            bgcolor: `${getPriorityColor(value)}15`,
            color: getPriorityColor(value),
            fontWeight: 700,
            fontSize: '0.7rem'
          }}
        />
      ),
    },
    {
      id: 'status',
      label: 'Status',
      format: (value: string) => <StatusBadge status={getStatusLabel(value)} />,
    },
    {
       id: 'assignedToUser',
       label: 'Assigned To',
       format: (_: any, row: Ticket) => (
         <Typography variant="body2" color="text.secondary">
           {row.assignedToUser ? row.assignedToUser.name : 'Unassigned'}
         </Typography>
       ),
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
      format: (_: any, row: Ticket) => (
        <Tooltip title="View Ticket" arrow>
          <IconButton
            size="small"
            onClick={() => navigate(`/hub/maintenance/${row.id}`)}
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

  const isLoading = ticketsLoading || propsLoading;

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
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
            }}
          >
            <MaintenanceIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={800}>
              Maintenance Tickets
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Track and resolve property issues reported by tenants.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
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
          <Grid size={{ xs: 12, md: 3 }}>
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
              <MenuItem value="assigned">Assigned</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              select
              fullWidth
              label="Priority"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              size="small"
            >
              <MenuItem value="all">All Priorities</MenuItem>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              select
              fullWidth
              label="Category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              size="small"
            >
              <MenuItem value="all">All Categories</MenuItem>
              <MenuItem value="plumbing">Plumbing</MenuItem>
              <MenuItem value="electrical">Electrical</MenuItem>
              <MenuItem value="structural">Structural</MenuItem>
              <MenuItem value="appliance">Appliance</MenuItem>
              <MenuItem value="pest">Pest</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Box>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={displayData}
        loading={isLoading}
        emptyTitle="No Tickets Found"
        emptyDescription="There are currently no maintenance tickets matching your filters."
      />
    </Box>
  );
}

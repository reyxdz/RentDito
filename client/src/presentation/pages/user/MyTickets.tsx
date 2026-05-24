import { useState, useEffect } from 'react';
import { Box, Button, Typography, Chip, Alert } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { ticketService } from '../../../infrastructure/services/TicketService';
import { useAuth } from '../../../application/context/AuthContext';
import { useNotification } from '../../../application/context/NotificationContext';
import type { Ticket } from '../../../domain/entities/Ticket';

export default function MyTickets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const hasTenancy = !!user?.activeTenancy;
  const tenancyId = typeof user?.activeTenancy === 'string' ? user?.activeTenancy : (user?.activeTenancy as any)?._id;

  useEffect(() => {
    if (hasTenancy && tenancyId) {
      loadTickets();
    } else {
      setIsLoading(false);
    }
  }, [hasTenancy, tenancyId]);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      // Assuming getTickets filters by the user's tickets or we filter by tenancy
      // The mock service currently might just return all, so we can filter locally or pass the user ID
      // Real backend would filter by JWT user.
      const data = await ticketService.getTickets({  });
      // Mock filter for tenant
      setTickets(data.filter(t => t.reportedByUserId === user?.id || t.tenancyId === tenancyId));
    } catch (error) {
      showNotification('Failed to load tickets', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const columns = [
    { 
      key: 'title', 
      header: 'Issue',
      render: (row: Ticket) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {row.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
            {row.category}
          </Typography>
        </Box>
      )
    },
    { 
      key: 'priority', 
      header: 'Priority',
      render: (row: Ticket) => (
        <Chip 
          label={row.priority} 
          size="small" 
          color={getPriorityColor(row.priority) as any} 
          sx={{ textTransform: 'capitalize', fontWeight: 600 }}
        />
      )
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (row: Ticket) => <StatusBadge status={row.status} />
    },
    { 
      key: 'assignedTo', 
      header: 'Assigned To',
      render: (row: Ticket) => (
        <Typography variant="body2" color={row.assignedToUser ? 'text.primary' : 'text.secondary'}>
          {row.assignedToUser?.name || 'Unassigned'}
        </Typography>
      )
    },
    { 
      key: 'createdAt', 
      header: 'Date Reported',
      render: (row: Ticket) => format(new Date(row.createdAt), 'MMM dd, yyyy'),
      sortable: true 
    }
  ];

  if (!hasTenancy) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <PageHeader title="Maintenance Tickets" />
        <Alert severity="info">You must have an active tenancy to submit maintenance tickets.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <PageHeader 
          title="Maintenance Tickets" 
          subtitle="Track and manage your maintenance requests" 
        />
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => navigate('/u/maintenance/new')}
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          Open New Ticket
        </Button>
      </Box>

      <Box sx={{ mb: 4 }}>
        <DataTable
          columns={columns}
          data={tickets}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          searchPlaceholder="Search tickets..."
          onRowClick={(row) => navigate(`/u/maintenance/${row.id}`)}
        />
      </Box>
    </Box>
  );
}

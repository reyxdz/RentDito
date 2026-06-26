import { useState, useEffect } from 'react';
import { Container, Box, Typography, Chip, TextField, MenuItem } from '@mui/material';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import AdminService from '../../../infrastructure/services/AdminService';
import { useNotification } from '../../../application/context/NotificationContext';
import { AuditLog } from '../../../infrastructure/services/AdminService';

export default function ActivityLog() {
  const [data, setData] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(30);
  const [totalCount, setTotalCount] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const { showNotification } = useNotification();

  const fetchActivityLog = async () => {
    try {
      setLoading(true);
      const res = await AdminService.getActivityLog({
        page: page + 1,
        limit: rowsPerPage,
        action: actionFilter || undefined,
      });
      setData(res.data);
      setTotalCount(res.pagination.total);
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Failed to fetch activity log', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityLog();
  }, [page, rowsPerPage, actionFilter]);

  const columns = [
    { 
      id: 'userId', 
      label: 'User', 
      format: (value: any) => {
        if (typeof value === 'object' && value !== null) {
          return `${value.name} (${value.email})`;
        }
        return value || 'System';
      }
    },
    { 
      id: 'action', 
      label: 'Action',
      format: (value: any) => <Chip label={value} size="small" variant="outlined" color="primary" />
    },
    { id: 'resourceType', label: 'Resource' },
    { id: 'resourceId', label: 'Resource ID' },
    { id: 'ip', label: 'IP Address' },
    { id: 'timestamp', label: 'Timestamp', format: (value: any) => new Date(value).toLocaleString() },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <PageHeader title="Activity Log" subtitle="Monitor system-wide user actions and events." />

      <Box sx={{ mt: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          select
          label="Filter by Action"
          size="small"
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All Actions</MenuItem>
          <MenuItem value="POST_API_ADMIN_VERIFICATIONS">Approve Verification</MenuItem>
          <MenuItem value="PATCH_API_ADMIN_VERIFICATIONS">Update Verification</MenuItem>
          <MenuItem value="PATCH_API_LANDLORD_APPLICATIONS">Update Landlord Application</MenuItem>
          <MenuItem value="POST_API_USERS">Create User</MenuItem>
          <MenuItem value="PATCH_API_USERS">Update User</MenuItem>
        </TextField>
      </Box>
      
      <Box sx={{ mt: 3 }}>
        <DataTable 
          columns={columns} 
          data={data} 
          loading={loading}
          emptyTitle="No Activity Logs" 
          emptyDescription="There are no system actions recorded yet." 
        />
        {/* Pagination could be handled inside DataTable or wrapped if needed. 
            Currently depending on DataTable implementation. */}
      </Box>
    </Container>
  );
}

import { useState, useEffect } from 'react';
import { Container, Box, Button, TextField } from '@mui/material';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import AdminService from '../../../infrastructure/services/AdminService';
import { useNotification } from '../../../application/context/NotificationContext';

interface ApplicationRow {
  _id: string;
  userId: { name: string; email: string };
  businessName: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function LandlordApplications() {
  const [data, setData] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const { showNotification } = useNotification();

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await AdminService.getLandlordApplications({ status: 'pending' });
      setData(res.data || []);
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Failed to fetch applications', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleActionClick = (id: string, type: 'approve' | 'reject') => {
    setSelectedId(id);
    setActionType(type);
    setReviewNotes('');
    setDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedId) return;
    
    try {
      if (actionType === 'approve') {
        await AdminService.approveLandlordApplication(selectedId);
        showNotification('Application approved successfully', 'success');
      } else {
        await AdminService.rejectLandlordApplication(selectedId, reviewNotes);
        showNotification('Application rejected', 'info');
      }
      setDialogOpen(false);
      fetchApplications();
    } catch (error: any) {
      showNotification(error.response?.data?.message || `Failed to ${actionType} application`, 'error');
    }
  };

  const columns = [
    { id: 'applicantName', label: 'Applicant', format: (_: any, row: ApplicationRow) => row.userId?.name || 'Unknown' },
    { id: 'businessName', label: 'Business Name' },
    { id: 'date', label: 'Submission Date', format: (_: any, row: ApplicationRow) => new Date(row.createdAt).toLocaleDateString() },
    { 
      id: 'status', 
      label: 'Status',
      format: (value: any) => <StatusBadge status={value} />
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right' as const,
      format: (_: any, row: ApplicationRow) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button size="small" variant="outlined" disabled>
            View Docs
          </Button>
          {row.status === 'pending' && (
            <>
              <Button size="small" variant="contained" color="success" onClick={() => handleActionClick(row._id, 'approve')} disableElevation>
                Approve
              </Button>
              <Button size="small" variant="contained" color="error" onClick={() => handleActionClick(row._id, 'reject')} disableElevation>
                Reject
              </Button>
            </>
          )}
        </Box>
      )
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageHeader title="Landlord Applications" subtitle="Review and approve new landlord registrations" />
      
      <Box sx={{ mt: 4 }}>
        <DataTable 
          columns={columns} 
          data={data} 
          loading={loading}
          emptyTitle="No Pending Applications" 
          emptyDescription="You're all caught up!" 
        />
      </Box>

      <ConfirmDialog
        open={dialogOpen}
        title={actionType === 'approve' ? 'Approve Application' : 'Reject Application'}
        message={
          <Box>
            {`Are you sure you want to ${actionType} this landlord application? ` + (actionType === 'approve' ? 'They will be granted Landlord access.' : '')}
            {actionType === 'reject' && (
              <TextField
                fullWidth
                margin="dense"
                size="small"
                label="Review Notes (Optional)"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                sx={{ mt: 2 }}
              />
            )}
          </Box>
        }
        confirmText={actionType === 'approve' ? 'Approve' : 'Reject'}
        color={actionType === 'approve' ? 'success' : 'error'}
        onCancel={() => setDialogOpen(false)}
        onConfirm={handleConfirm}
      />
    </Container>
  );
}

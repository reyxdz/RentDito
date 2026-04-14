import { useState } from 'react';
import { Container, Box, Button } from '@mui/material';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';

interface ApplicationRow {
  id: string;
  applicantName: string;
  businessName: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
}

const MOCK_DATA: ApplicationRow[] = [
  { id: '1', applicantName: 'John Doe', businessName: 'JD Real Estate', date: '2023-11-20', status: 'pending' },
  { id: '2', applicantName: 'Sarah Smith', businessName: 'Smith Homes', date: '2023-11-18', status: 'approved' },
];

export default function LandlordApplications() {
  const [data, setData] = useState<ApplicationRow[]>(MOCK_DATA);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

  const handleActionClick = (id: string, type: 'approve' | 'reject') => {
    setSelectedId(id);
    setActionType(type);
    setDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedId) return;
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setData(prev => prev.map(row => 
      row.id === selectedId 
        ? { ...row, status: actionType === 'approve' ? 'approved' : 'rejected' } 
        : row
    ));
    setDialogOpen(false);
  };

  const columns = [
    { id: 'applicantName', label: 'Applicant' },
    { id: 'businessName', label: 'Business Name' },
    { id: 'date', label: 'Submission Date' },
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
          <Button size="small" variant="outlined" onClick={() => console.log('View Docs', row.id)}>
            View Docs
          </Button>
          {row.status === 'pending' && (
            <>
              <Button size="small" variant="contained" color="success" onClick={() => handleActionClick(row.id, 'approve')} disableElevation>
                Approve
              </Button>
              <Button size="small" variant="contained" color="error" onClick={() => handleActionClick(row.id, 'reject')} disableElevation>
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
          emptyTitle="No Pending Applications" 
          emptyDescription="You're all caught up!" 
        />
      </Box>

      <ConfirmDialog
        open={dialogOpen}
        title={actionType === 'approve' ? 'Approve Application' : 'Reject Application'}
        message={`Are you sure you want to ${actionType} this landlord application? ` + (actionType === 'approve' ? 'They will be granted Landlord access.' : '')}
        confirmText={actionType === 'approve' ? 'Approve' : 'Reject'}
        color={actionType === 'approve' ? 'success' : 'error'}
        onCancel={() => setDialogOpen(false)}
        onConfirm={handleConfirm}
      />
    </Container>
  );
}

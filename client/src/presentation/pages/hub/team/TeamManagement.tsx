import { useState } from 'react';
import { Container, Box, Button, TextField, Chip, Alert, Snackbar, CircularProgress, Typography } from '@mui/material';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import FormDialog from '../../../components/FormDialog';
import PermissionMatrix from '../../../components/PermissionMatrix';
import type { PermissionKey } from '../../../components/PermissionMatrix';
import { PersonAdd } from '@mui/icons-material';
import { useTeam } from '../../../../application/hooks/useTeam';

export default function TeamManagement() {
  const { staff, loading, error, inviteStaff, removeStaff } = useTeam();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invite Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [position, setPosition] = useState('');
  const [permissions, setPermissions] = useState<PermissionKey[]>(['dashboard']);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const resetForm = () => {
    setName('');
    setEmail('');
    setPosition('');
    setPermissions(['dashboard']);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await inviteStaff({
        name,
        email,
        positionName: position,
        permissions,
      });
      setSnackbar({ open: true, message: 'Staff invitation sent successfully!', severity: 'success' });
      setIsInviteOpen(false);
      resetForm();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to send invitation', severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (staffId: string) => {
    try {
      await removeStaff(staffId);
      setSnackbar({ open: true, message: 'Staff member removed.', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to remove staff', severity: 'error' });
    }
  };

  const columns = [
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
    { id: 'positionName', label: 'Position' },
    {
      id: 'permissions',
      label: 'Access Keys',
      format: (_: any, row: any) =>
        row.permissions?.length > 3
          ? <Chip size="small" label={`${row.permissions.length} keys`} />
          : <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {(row.permissions || []).map((p: string) => <Chip size="small" key={p} label={p} />)}
            </Box>
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right' as const,
      format: (_: any, row: any) => (
        <Button size="small" color="error" onClick={() => handleRemove(row.id)}>Remove</Button>
      )
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageHeader
        title="Team Management"
        subtitle="Invite staff and manage their access permissions"
        action={
          <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setIsInviteOpen(true)}>
            Invite Staff
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      )}

      <Box sx={{ mt: 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <DataTable
            columns={columns}
            data={staff}
            emptyTitle="No Staff Members"
            emptyDescription="You haven't invited any staff yet. Click Invite Staff to get started."
          />
        )}
      </Box>

      <FormDialog
        open={isInviteOpen}
        title="Invite New Staff"
        onClose={() => { setIsInviteOpen(false); resetForm(); }}
        onSubmit={handleInviteSubmit}
        submitText="Send Invitation"
        loading={isSubmitting}
        maxWidth="md"
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          <TextField label="Full Name" value={name} onChange={e => setName(e.target.value)} required fullWidth />
          <TextField type="email" label="Email Address" value={email} onChange={e => setEmail(e.target.value)} required fullWidth />
          <TextField label="Position Title (e.g. Accountant, Maintenance)" value={position} onChange={e => setPosition(e.target.value)} required fullWidth />
        </Box>

        <PermissionMatrix selectedPermissions={permissions} onChange={setPermissions} />
      </FormDialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

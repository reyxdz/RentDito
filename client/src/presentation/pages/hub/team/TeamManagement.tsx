import { useState } from 'react';
import { Container, Box, Button, TextField, Chip } from '@mui/material';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import FormDialog from '../../../components/FormDialog';
import PermissionMatrix from '../../../components/PermissionMatrix';
import type { PermissionKey } from '../../../components/PermissionMatrix';
import { PersonAdd } from '@mui/icons-material';

interface StaffRow {
  id: string;
  name: string;
  email: string;
  position: string;
  permissions: string[];
}

export default function TeamManagement() {
  const [data, setData] = useState<StaffRow[]>([
    { id: '1', name: 'John Manager', email: 'john@rentdito.com', position: 'Property Manager', permissions: ['dashboard', 'properties', 'units'] },
  ]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invite Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [position, setPosition] = useState('');
  const [permissions, setPermissions] = useState<PermissionKey[]>(['dashboard']);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setData(prev => [...prev, {
      id: Math.random().toString(),
      name,
      email,
      position,
      permissions
    }]);
    
    setIsSubmitting(false);
    setIsInviteOpen(false);
    
    // Reset
    setName(''); setEmail(''); setPosition(''); setPermissions(['dashboard']);
  };

  const columns = [
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
    { id: 'position', label: 'Position' },
    { 
      id: 'permissions', 
      label: 'Access Keys',
      format: (_: any, row: StaffRow) => (
        row.permissions.length > 3 
          ? <Chip size="small" label={`${row.permissions.length} keys`} />
          : <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {row.permissions.map(p => <Chip size="small" key={p} label={p} />)}
            </Box>
      )
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right' as const,
      format: (_: any, row: StaffRow) => (
        <Button size="small" color="error" onClick={() => setData(d => d.filter(item => item.id !== row.id))}>Remove</Button>
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
      
      <Box sx={{ mt: 4 }}>
        <DataTable 
          columns={columns} 
          data={data} 
          emptyTitle="No Staff Members" 
          emptyDescription="You haven't invited any staff yet. Click Invite Staff to get started." 
        />
      </Box>

      <FormDialog
        open={isInviteOpen}
        title="Invite New Staff"
        onClose={() => setIsInviteOpen(false)}
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
    </Container>
  );
}

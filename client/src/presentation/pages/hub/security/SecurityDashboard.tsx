import { useEffect, useState, useMemo } from 'react';
import { 
  Box, Typography, Grid, Card, CardContent, TextField, MenuItem, 
  Button, Dialog, DialogTitle, DialogContent, 
  DialogActions, Chip
} from '@mui/material';
import { 
  Security as SecurityIcon, 
  LocalPhone as PhoneIcon, 
  Add as AddIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useSecurity } from '../../../../application/hooks/useSecurity';
import { useProperties } from '../../../../application/hooks/useProperties';
import DataTable from '../../../components/DataTable';
import type { Column } from '../../../components/DataTable';
import type { IncidentReport, EmergencyContact } from '../../../../domain/entities/IncidentReport';
import StatusBadge from '../../../components/StatusBadge';

const SEVERITY_COLORS = {
  low: 'success',
  medium: 'warning',
  high: 'error',
  critical: 'error'
} as const;

export default function SecurityDashboard() {
  const { incidents, contacts, loading: secLoading, fetchIncidents, fetchContacts, createIncident, updateContacts } = useSecurity();
  const { properties, loading: propsLoading } = useProperties();
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [isIncidentOpen, setIsIncidentOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  
  // Incident Form State
  const [incType, setIncType] = useState('other');
  const [incSeverity, setIncSeverity] = useState('low');
  const [incDesc, setIncDesc] = useState('');
  const [incPropId, setIncPropId] = useState('');

  // Contacts Form State
  const [editContacts, setEditContacts] = useState<EmergencyContact[]>([]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  useEffect(() => {
    if (selectedPropertyId && selectedPropertyId !== 'all') {
      fetchContacts(selectedPropertyId);
    }
  }, [selectedPropertyId, fetchContacts]);

  const displayIncidents = useMemo(() => {
    if (selectedPropertyId === 'all') return incidents;
    return incidents.filter(i => i.propertyId === selectedPropertyId);
  }, [incidents, selectedPropertyId]);

  const handleIncidentSubmit = async () => {
    if (!incPropId || !incDesc) return;
    await createIncident({
      propertyId: incPropId,
      type: incType as any,
      severity: incSeverity as any,
      description: incDesc,
      dateOfIncident: new Date().toISOString()
    });
    setIsIncidentOpen(false);
    setIncDesc('');
  };

  const handleOpenContacts = () => {
    setEditContacts(contacts.length > 0 ? [...contacts] : [{ name: '', phone: '', role: 'Police' }]);
    setIsContactsOpen(true);
  };

  const handleSaveContacts = async () => {
    if (selectedPropertyId === 'all') return;
    // Filter out empty ones
    const valid = editContacts.filter(c => c.name.trim() && c.phone.trim());
    await updateContacts(selectedPropertyId, valid);
    setIsContactsOpen(false);
  };

  const addContactRow = () => setEditContacts([...editContacts, { name: '', phone: '', role: '' }]);

  const incidentColumns: Column<IncidentReport>[] = [
    {
      id: 'type',
      label: 'Type',
      format: (value: string) => (
        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
          {value.replace('_', ' ')}
        </Typography>
      ),
    },
    {
      id: 'severity',
      label: 'Severity',
      format: (value: keyof typeof SEVERITY_COLORS) => (
        <Chip label={value.toUpperCase()} size="small" color={SEVERITY_COLORS[value]} sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
      ),
    },
    {
      id: 'propertyId',
      label: 'Property',
      format: (_: any, row: IncidentReport) => {
        const prop = properties.find(p => p.id === row.propertyId);
        return <Typography variant="body2">{prop?.name || 'Unknown'}</Typography>;
      },
    },
    {
      id: 'dateOfIncident',
      label: 'Date',
      sortable: true,
      format: (value: string | Date) => (
        <Typography variant="body2">{new Date(value).toLocaleDateString()}</Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      format: (value: string) => <StatusBadge status={value} />,
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
            }}
          >
            <SecurityIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={800}>Security & Incidents</Typography>
            <Typography variant="body1" color="text.secondary">
              Manage emergency contacts and track property incidents.
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mb: 4, width: { xs: '100%', md: '30%' } }}>
        <TextField
          select
          fullWidth
          label="Select Property"
          value={selectedPropertyId}
          onChange={(e) => setSelectedPropertyId(e.target.value)}
          size="small"
        >
          <MenuItem value="all">All Properties</MenuItem>
          {properties.map(p => (
            <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Emergency Contacts Section */}
      {selectedPropertyId !== 'all' && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneIcon color="primary" /> Emergency Contacts
              </Typography>
              <Button size="small" variant="outlined" onClick={handleOpenContacts}>Edit Contacts</Button>
            </Box>
            <Grid container spacing={2}>
              {contacts.length === 0 ? (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" color="text.secondary">No emergency contacts configured for this property.</Typography>
                </Grid>
              ) : (
                contacts.map((c, i) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.default' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>
                        {c.role}
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>{c.name}</Typography>
                      <Typography variant="body2" color="primary.main" sx={{ mt: 0.5 }}>{c.phone}</Typography>
                    </Box>
                  </Grid>
                ))
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Incident Reports Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" /> Incident Reports
        </Typography>
        <Button variant="contained" color="error" startIcon={<AddIcon />} onClick={() => setIsIncidentOpen(true)}>
          Report Incident
        </Button>
      </Box>

      <DataTable
        columns={incidentColumns}
        data={displayIncidents}
        loading={secLoading || propsLoading}
        emptyTitle="No Incidents"
        emptyDescription="There are no incident reports matching your filters."
      />

      {/* Report Incident Dialog */}
      <Dialog open={isIncidentOpen} onClose={() => setIsIncidentOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Report Security Incident</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 1 }}>
            <TextField select label="Property" fullWidth required value={incPropId} onChange={(e) => setIncPropId(e.target.value)}>
              {properties.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </TextField>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField select label="Incident Type" fullWidth required value={incType} onChange={(e) => setIncType(e.target.value)}>
                <MenuItem value="theft">Theft</MenuItem>
                <MenuItem value="damage">Property Damage</MenuItem>
                <MenuItem value="medical">Medical Emergency</MenuItem>
                <MenuItem value="fire">Fire</MenuItem>
                <MenuItem value="dispute">Dispute</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
              <TextField select label="Severity" fullWidth required value={incSeverity} onChange={(e) => setIncSeverity(e.target.value)}>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </TextField>
            </Box>
            <TextField label="Description" fullWidth required multiline rows={4} value={incDesc} onChange={(e) => setIncDesc(e.target.value)} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsIncidentOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" color="error" onClick={handleIncidentSubmit} disabled={!incPropId || !incDesc}>Submit Report</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Contacts Dialog */}
      <Dialog open={isContactsOpen} onClose={() => setIsContactsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Emergency Contacts</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
            {editContacts.map((c, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1 }}>
                <TextField size="small" label="Role (e.g. Police)" value={c.role} onChange={(e) => {
                  const newC = [...editContacts]; newC[i].role = e.target.value; setEditContacts(newC);
                }} sx={{ width: '30%' }} />
                <TextField size="small" label="Name" value={c.name} onChange={(e) => {
                  const newC = [...editContacts]; newC[i].name = e.target.value; setEditContacts(newC);
                }} sx={{ width: '35%' }} />
                <TextField size="small" label="Phone" value={c.phone} onChange={(e) => {
                  const newC = [...editContacts]; newC[i].phone = e.target.value; setEditContacts(newC);
                }} sx={{ width: '35%' }} />
              </Box>
            ))}
            <Button startIcon={<AddIcon />} onClick={addContactRow} sx={{ alignSelf: 'flex-start' }}>Add Contact</Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsContactsOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={handleSaveContacts}>Save Contacts</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}

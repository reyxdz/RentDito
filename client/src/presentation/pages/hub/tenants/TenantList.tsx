import { useEffect, useState, useMemo } from 'react';
import { Box, Typography, IconButton, Autocomplete, TextField } from '@mui/material';
import { Visibility as ViewIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import { useTenants } from '../../../../application/hooks/useTenants';
import { useProperties } from '../../../../application/hooks/useProperties';

export default function TenantList() {
  const navigate = useNavigate();
  const { tenancies, loading, fetchTenancies } = useTenants();
  const { properties, refresh: fetchProperties } = useProperties();
  
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchTenancies();
    fetchProperties();
  }, [fetchTenancies, fetchProperties]);

  const filteredTenancies = useMemo(() => {
    return tenancies.filter((tenancy) => {
      let matches = true;
      if (selectedProperty && tenancy.propertyId !== selectedProperty) matches = false;
      if (selectedStatus && tenancy.status !== selectedStatus) matches = false;
      return matches;
    });
  }, [tenancies, selectedProperty, selectedStatus]);

  const propertyOptions = properties.map((p) => ({ label: p.name, value: p.id }));
  const statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Checked In', value: 'checked_in' },
    { label: 'Checked Out', value: 'checked_out' },
  ];

  const columns = [
    {
      id: 'tenant',
      label: 'Tenant',
      render: (row: any) => (
        <Typography variant="body2" fontWeight={600}>
          {row.personalDetails?.fullName || row.user?.name || 'Unknown'}
        </Typography>
      ),
    },
    {
      id: 'property',
      label: 'Property',
      render: (row: any) => row.property?.name || '—',
    },
    {
      id: 'unit',
      label: 'Unit',
      render: (row: any) => {
        let label = row.unit?.unitIdentifier || '—';
        if (row.slotNumber) label += ` (Slot ${row.slotNumber})`;
        return label;
      },
    },
    {
      id: 'checkInDate',
      label: 'Check-In Date',
      render: (row: any) => row.checkInDate ? new Date(row.checkInDate).toLocaleDateString() : '—',
    },
    {
      id: 'status',
      label: 'Status',
      render: (row: any) => <StatusBadge status={row.status} />,
    },
    {
      id: 'actions',
      label: '',
      align: 'right' as const,
      render: (row: any) => (
        <IconButton size="small" onClick={() => navigate(`/hub/tenants/${row.id}`)}>
          <ViewIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <PageHeader
        title="Tenants"
        subtitle="Manage active and past tenancies across your properties"
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Autocomplete
          options={propertyOptions}
          value={propertyOptions.find((p) => p.value === selectedProperty) || null}
          onChange={(_, newValue) => setSelectedProperty(newValue ? newValue.value : null)}
          renderInput={(params) => <TextField {...params} label="Filter by Property" size="small" />}
          sx={{ width: 250 }}
        />
        <Autocomplete
          options={statusOptions}
          value={statusOptions.find((s) => s.value === selectedStatus) || null}
          onChange={(_, newValue) => setSelectedStatus(newValue ? newValue.value : null)}
          renderInput={(params) => <TextField {...params} label="Filter by Status" size="small" />}
          sx={{ width: 200 }}
        />
      </Box>

      <DataTable
        columns={columns}
        data={filteredTenancies}
        loading={loading}
        emptyTitle="No Tenants Found"
        emptyDescription="There are currently no active tenancies matching your filters."
      />
    </Box>
  );
}

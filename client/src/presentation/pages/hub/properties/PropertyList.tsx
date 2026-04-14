import { useState, useMemo } from 'react';
import { Box, Button, TextField, MenuItem, IconButton, Avatar } from '@mui/material';
import { Add as AddIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/PageHeader';
import DataTable, { type Column } from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import { useProperties } from '../../../../application/hooks/useProperties';
import type { Property, PropertyType, PropertyStatus } from '../../../../domain/entities/Property';

const propertyTypes: PropertyType[] = [
  'Boarding House', 'Apartment', 'Studio', 'Dormitory', 'Commercial', 'Parking', 'Land', 'Mixed Use'
];
const propertyStatuses: PropertyStatus[] = ['Active', 'Disabled', 'Maintenance', 'Archived'];

export default function PropertyList() {
  const navigate = useNavigate();
  const { properties, loading, error } = useProperties();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<PropertyType | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | 'All'>('All');
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filteredData = useMemo(() => {
    return properties.filter((prop) => {
      const matchSearch = prop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          prop.address.city.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = typeFilter === 'All' || prop.propertyType === typeFilter;
      const matchStatus = statusFilter === 'All' || prop.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [properties, searchTerm, typeFilter, statusFilter]);

  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  const columns: Column<Property>[] = [
    {
      id: 'image',
      label: 'Thumbnail',
      format: (_, row) => (
        <Avatar src={row.images?.[0]} variant="rounded" sx={{ width: 56, height: 56 }}>
          {row.name.charAt(0)}
        </Avatar>
      )
    },
    {
      id: 'name',
      label: 'Name',
      format: (_, row) => <strong>{row.name}</strong>
    },
    {
      id: 'propertyType',
      label: 'Type',
    },
    {
      id: 'address',
      label: 'Location',
      format: (_, row) => `${row.address.city}, ${row.address.state}`
    },
    {
      id: 'units',
      label: 'Units',
      format: (_, row) => `${row.metrics.totalUnits} Total (${row.metrics.vacantUnits} Vacant)`
    },
    {
      id: 'status',
      label: 'Status',
      format: (_, row) => <StatusBadge status={row.status} />
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      format: (_, row) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <IconButton size="small" onClick={() => navigate(`/hub/properties/${row.id}`)} color="primary">
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Box>
      )
    }
  ];

  return (
    <Box>
      <PageHeader
        title="Properties"
        subtitle="Manage all your rental properties in one place."
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { /* Placeholder for add property form */ }}
            sx={{ fontWeight: 'bold' }}
          >
            Add Property
          </Button>
        }
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          label="Search Properties"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
          sx={{ minWidth: 250, flexGrow: 1 }}
        />
        <TextField
          select
          label="Type"
          size="small"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as any); setPage(0); }}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="All">All Types</MenuItem>
          {propertyTypes.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
        </TextField>
        <TextField
          select
          label="Status"
          size="small"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as any); setPage(0); }}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="All">All Statuses</MenuItem>
          {propertyStatuses.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
      </Box>

      {error ? (
        <Box sx={{ color: 'error.main', p: 2 }}>{error}</Box>
      ) : (
        <DataTable
          columns={columns}
          data={paginatedData}
          loading={loading}
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={filteredData.length}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          emptyTitle="No properties found"
          emptyDescription="Try adjusting your filters or click 'Add Property' to create a new one."
        />
      )}
    </Box>
  );
}

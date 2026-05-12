import { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Button, MenuItem, Grid, TextField } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useUnits } from '../../../../application/hooks/useUnits';
import { useProperties } from '../../../../application/hooks/useProperties';
import DataTable from '../../../components/DataTable';
import type { Column } from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import type { Unit } from '../../../../domain/entities/Unit';

export default function UnitList() {
  const navigate = useNavigate();
  const { units, fetchUnits, loading: unitsLoading } = useUnits();
  const { properties, loading: propsLoading } = useProperties();

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    if (selectedPropertyId === 'all') {
      fetchUnits();
    } else {
      // Use the query-based filter on GET /api/units?propertyId=...
      fetchUnits({ propertyId: selectedPropertyId });
    }
  }, [selectedPropertyId, fetchUnits]);

  const getPropertyName = (propId: string | any) => {
    // propId may be a populated object (from server .populate()) or a string
    if (typeof propId === 'object' && propId?.name) return propId.name;
    return properties.find(p => p.id === propId)?.name || 'Unknown Property';
  };

  const columns: Column<Unit>[] = [
    {
      id: 'unitIdentifier',
      label: 'Identifier',
      format: (value: string) => (
        <Typography variant="subtitle2" fontWeight={600}>
          {value}
        </Typography>
      )
    },
    {
      id: 'propertyId',
      label: 'Property',
      format: (val: string) => getPropertyName(val)
    },
    {
      id: 'accommodationType',
      label: 'Type',
      format: (val: string) => val === 'room' ? 'Room' : 'Bedspace'
    },
    {
      id: 'rent',
      label: 'Pricing',
      format: (_: any, row: Unit) => {
        if (row.accommodationType === 'room') return `₱${row.roomRent?.toLocaleString() || 0} / room`;
        return `₱${row.bedspaceRent?.toLocaleString() || 0} / bed`;
      }
    },
    {
      id: 'capacity',
      label: 'Occupants/Cap',
      format: (_: any, row: Unit) => `${row.capacity || 0} / ${row.maxOccupants || 0}`
    },
    {
      id: 'status',
      label: 'Status',
      format: (value: string) => <StatusBadge status={value as any} />
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      format: (_: any, row: Unit) => (
        <Button size="small" variant="outlined" onClick={() => navigate(`/hub/units/${row.id}`)}>
          View
        </Button>
      )
    }
  ];

  // Filtering
  const filteredUnits = useMemo(() => {
    let filtered = units;
    
    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(u => u.status === selectedStatus);
    }
    
    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(u => u.accommodationType === selectedType);
    }

    return filtered;
  }, [units, selectedStatus, selectedType]);

  const isLoading = unitsLoading || propsLoading;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Units
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your rooms and bedspaces across properties.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/hub/units/new')}
          sx={{ fontWeight: 700 }}
        >
          Add Unit
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              fullWidth
              label="Select Property"
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
            >
              <MenuItem value="all">All Properties</MenuItem>
              {properties.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              fullWidth
              label="Status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="vacant">Vacant</MenuItem>
              <MenuItem value="occupied">Occupied</MenuItem>
              <MenuItem value="reserved">Reserved</MenuItem>
              <MenuItem value="maintenance">Maintenance</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              fullWidth
              label="Accommodation Type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="room">Room</MenuItem>
              <MenuItem value="bedspace">Bedspace</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Box>

      <DataTable
        columns={columns}
        data={filteredUnits}
        loading={isLoading}
        emptyTitle="No Units Found"
        emptyDescription="Get started by adding your first unit to a property."
      />
    </Box>
  );
}

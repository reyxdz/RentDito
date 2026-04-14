import { useEffect, useState } from 'react';
import { Box, Typography, Button, Chip } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../application/context/AuthContext';
import DataTable from '../../../components/DataTable';
import type { Column } from '../../../components/DataTable';
import { mockPropertyService } from '../../../../infrastructure/services/MockPropertyService';
import type { Property } from '../../../../domain/entities/Property';

export default function PropertyList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadProperties();
    }
  }, [user]);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const data = await mockPropertyService.getPropertiesByLandlord(user!.id);
      setProperties(data);
    } catch (error) {
      console.error('Failed to load properties', error);
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<Property>[] = [
    {
      id: 'name',
      label: 'Property Name',
      format: (value: string) => (
        <Typography variant="subtitle2" fontWeight={600}>
          {value}
        </Typography>
      )
    },
    {
      id: 'propertyType',
      label: 'Type',
    },
    {
      id: 'address',
      label: 'Location',
      format: (val: any) => `${val.street}, ${val.city}`
    },
    {
      id: 'status',
      label: 'Status',
      format: (value: string) => {
        let color: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" = 'default';
        if (value === 'Active') color = 'success';
        if (value === 'Disabled') color = 'error';
        if (value === 'Maintenance') color = 'warning';
        return <Chip label={value} size="small" color={color} sx={{ fontWeight: 600 }} />;
      }
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      format: (_: any, row: Property) => (
        <Button size="small" variant="outlined" onClick={() => navigate(`/hub/properties/${row.id}/edit`)}>
          Edit
        </Button>
      )
    }
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Properties
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your properties and list new ones.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/hub/properties/new')}
          sx={{ fontWeight: 700 }}
        >
          Add Property
        </Button>
      </Box>

      <DataTable
        columns={columns}
        data={properties}
        loading={loading}
        emptyTitle="No Properties Found"
        emptyDescription="Get started by adding your first property."
      />
    </Box>
  );
}

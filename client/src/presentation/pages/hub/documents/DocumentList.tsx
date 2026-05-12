import { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Button, IconButton, Tooltip, MenuItem, TextField, Grid } from '@mui/material';
import { 
  Description as DocIcon, 
  Download as DownloadIcon, 
  Delete as DeleteIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';
import { useDocuments } from '../../../../application/hooks/useDocuments';
import { useProperties } from '../../../../application/hooks/useProperties';
import DataTable from '../../../components/DataTable';
import type { Column } from '../../../components/DataTable';
import type { DocumentEntity } from '../../../../domain/entities/Document';
import DocumentUploadForm from './DocumentUploadForm';

export default function DocumentList() {
  const { documents, loading: docsLoading, fetchDocuments, deleteDocument } = useDocuments();
  const { properties, loading: propsLoading } = useProperties();
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const displayData = useMemo(() => {
    let data = documents;
    if (selectedType !== 'all') {
      data = data.filter((d) => d.type === selectedType);
    }
    if (selectedPropertyId !== 'all') {
      data = data.filter((d) => d.propertyId === selectedPropertyId);
    }
    return data;
  }, [documents, selectedType, selectedPropertyId]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      await deleteDocument(id);
    }
  };

  const columns: Column<DocumentEntity>[] = [
    {
      id: 'type',
      label: 'Type',
      format: (value: string) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DocIcon color="primary" fontSize="small" />
          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
            {value.replace('_', ' ')}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'title',
      label: 'Title',
      format: (value: string) => (
        <Typography variant="subtitle2" fontWeight={600}>{value}</Typography>
      ),
    },
    {
      id: 'propertyId',
      label: 'Linked Entity',
      format: (_: any, row: DocumentEntity) => {
        const prop = properties.find(p => p.id === row.propertyId);
        return (
          <Box>
            <Typography variant="body2" fontWeight={500}>{prop?.name || 'Unknown'}</Typography>
            {row.unitId && <Typography variant="caption" color="text.secondary">Unit: {row.unitId}</Typography>}
          </Box>
        );
      },
    },
    {
      id: 'uploadedByUser',
      label: 'Uploaded By',
      format: (_: any, row: DocumentEntity) => (
        <Typography variant="body2" color="text.secondary">
          {row.uploadedByUser?.name || 'Unknown'}
        </Typography>
      ),
    },
    {
      id: 'createdAt',
      label: 'Date',
      sortable: true,
      format: (value: string | Date) => (
        <Typography variant="body2" color="text.secondary">
          {new Date(value).toLocaleDateString('en-PH')}
        </Typography>
      ),
    },
    {
      id: 'actions',
      label: '',
      align: 'right',
      format: (_: any, row: DocumentEntity) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Tooltip title="Download" arrow>
            <IconButton
              size="small"
              onClick={() => window.open(row.fileUrl, '_blank')}
              sx={{ color: 'primary.main', '&:hover': { bgcolor: 'primary.50' } }}
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete" arrow>
            <IconButton
              size="small"
              onClick={() => handleDelete(row.id)}
              sx={{ color: 'error.main', '&:hover': { bgcolor: 'error.50' } }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const isLoading = docsLoading || propsLoading;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
            }}
          >
            <DocIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={800}>Documents</Typography>
            <Typography variant="body1" color="text.secondary">
              Manage and organize your property documents and files.
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => setIsUploadOpen(true)}
          sx={{ borderRadius: 2 }}
        >
          Upload Document
        </Button>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              fullWidth
              label="Property"
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              size="small"
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
              label="Document Type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              size="small"
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="lease">Lease Agreement</MenuItem>
              <MenuItem value="id">ID Document</MenuItem>
              <MenuItem value="contract">Contract</MenuItem>
              <MenuItem value="receipt">Receipt</MenuItem>
              <MenuItem value="incident">Incident Report</MenuItem>
              <MenuItem value="inventory_form">Inventory Form</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Box>

      <DataTable
        columns={columns}
        data={displayData}
        loading={isLoading}
        emptyTitle="No Documents Found"
        emptyDescription="There are currently no documents matching your filters."
      />

      <DocumentUploadForm 
        open={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        onUploadSuccess={() => fetchDocuments()}
      />
    </Box>
  );
}

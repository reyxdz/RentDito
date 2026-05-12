import { useState, useCallback } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, MenuItem, Box, Typography, 
  CircularProgress, IconButton
} from '@mui/material';
import { CloudUpload as UploadIcon, Close as CloseIcon, InsertDriveFile as FileIcon } from '@mui/icons-material';
import { useDocuments } from '../../../../application/hooks/useDocuments';
import { useProperties } from '../../../../application/hooks/useProperties';

interface DocumentUploadFormProps {
  open: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export default function DocumentUploadForm({ open, onClose, onUploadSuccess }: DocumentUploadFormProps) {
  const { createDocument, loading: uploadLoading } = useDocuments();
  const { properties } = useProperties();
  
  const [title, setTitle] = useState('');
  const [type, setType] = useState('other');
  const [propertyId, setPropertyId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file || !title || !propertyId) return;
    try {
      await createDocument({ title, type: type as any, propertyId, unitId }, file);
      onUploadSuccess();
      handleClose();
    } catch (err) {
      console.error("Failed to upload document", err);
    }
  };

  const handleClose = () => {
    setTitle('');
    setType('other');
    setPropertyId('');
    setUnitId('');
    setFile(null);
    onClose();
  };

  const isFormValid = file && title.trim() !== '' && propertyId !== '';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700}>Upload Document</Typography>
        <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 1 }}>
          <TextField
            label="Document Title"
            fullWidth
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              select
              label="Document Type"
              fullWidth
              required
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <MenuItem value="lease">Lease Agreement</MenuItem>
              <MenuItem value="id">ID Document</MenuItem>
              <MenuItem value="contract">Contract</MenuItem>
              <MenuItem value="receipt">Receipt</MenuItem>
              <MenuItem value="incident">Incident Report</MenuItem>
              <MenuItem value="inventory_form">Inventory Form</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>
            
            <TextField
              select
              label="Property"
              fullWidth
              required
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
            >
              {properties.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </TextField>
          </Box>
          
          <TextField
            label="Unit Identifier (Optional)"
            fullWidth
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            placeholder="e.g. Unit 1A"
          />

          <Box 
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            sx={{
              border: '2px dashed',
              borderColor: file ? 'primary.main' : 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              bgcolor: file ? 'primary.50' : 'background.default',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50' }
            }}
            onClick={() => document.getElementById('file-upload-input')?.click()}
          >
            <input
              id="file-upload-input"
              type="file"
              hidden
              onChange={handleFileSelect}
            />
            {!file ? (
              <>
                <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body1" fontWeight={500}>
                  Drag & drop a file here, or click to select
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Supports PDF, JPG, PNG up to 10MB
                </Typography>
              </>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <FileIcon color="primary" />
                <Typography variant="body1" fontWeight={600} color="primary.main">
                  {file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, px: 3 }}>
        <Button onClick={handleClose} color="inherit">Cancel</Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit} 
          disabled={!isFormValid || uploadLoading}
          startIcon={uploadLoading && <CircularProgress size={20} color="inherit" />}
        >
          {uploadLoading ? 'Uploading...' : 'Upload Document'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

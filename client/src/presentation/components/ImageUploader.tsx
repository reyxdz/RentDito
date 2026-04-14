import React, { useState, useCallback } from 'react';
import { Box, Typography, IconButton, Paper, Grid } from '@mui/material';
import { CloudUpload as CloudUploadIcon, Delete as DeleteIcon } from '@mui/icons-material';

interface ImageUploaderProps {
  images: File[];
  onImagesChange: (images: File[]) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ images, onImagesChange }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsHovered(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
      onImagesChange([...images, ...newFiles]);
    }
  }, [images, onImagesChange]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
      onImagesChange([...images, ...newFiles]);
    }
  };

  const removeImage = (index: number) => {
    const updated = [...images];
    updated.splice(index, 1);
    onImagesChange(updated);
  };

  return (
    <Box>
      <Paper
        variant="outlined"
        onDragOver={(e) => { e.preventDefault(); setIsHovered(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsHovered(false); }}
        onDrop={handleDrop}
        sx={{
          border: isHovered ? '2px dashed' : '2px dashed',
          borderColor: isHovered ? 'primary.main' : 'divider',
          bgcolor: isHovered ? 'action.hover' : 'background.paper',
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          borderRadius: 2,
          mb: 2,
          transition: 'all 0.2s ease-in-out'
        }}
        onClick={() => document.getElementById('image-upload-input')?.click()}
      >
        <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="h6" color="text.secondary">
          Drag & Drop Images Here
        </Typography>
        <Typography variant="body2" color="text.secondary">
          or click to select files
        </Typography>
        <input
          id="image-upload-input"
          type="file"
          multiple
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </Paper>

      {images.length > 0 && (
        <Grid container spacing={2}>
          {images.map((img, idx) => (
            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={idx}>
              <Box position="relative">
                <Box
                  component="img"
                  src={URL.createObjectURL(img)}
                  alt={`Preview ${idx}`}
                  sx={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: 2 }}
                />
                <IconButton
                  size="small"
                  sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.default' } }}
                  onClick={() => removeImage(idx)}
                >
                  <DeleteIcon fontSize="small" color="error" />
                </IconButton>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default ImageUploader;

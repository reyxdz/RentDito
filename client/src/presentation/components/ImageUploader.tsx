import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Grid,
  useTheme,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

export interface ImageUploaderProps {
  images: File[];
  onChange: (images: File[]) => void;
  maxFiles?: number;
}

export default function ImageUploader({
  images,
  onChange,
  maxFiles = 10,
}: ImageUploaderProps) {
  const theme = useTheme();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
    // reset so same files can be chosen again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => file.type.startsWith('image/'));
    const totalFiles = [...images, ...validFiles];
    if (totalFiles.length > maxFiles) {
      // take only up to maxFiles
      onChange(totalFiles.slice(0, maxFiles));
    } else {
      onChange(totalFiles);
    }
  };

  const removeImage = (indexToRemove: number) => {
    onChange(images.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <Box>
      <Box
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        sx={{
          border: `2px dashed ${isDragOver ? theme.palette.primary.main : theme.palette.divider}`,
          borderRadius: 3,
          p: 4,
          textAlign: 'center',
          bgcolor: isDragOver ? theme.palette.action.hover : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          mb: 3,
          '&:hover': {
            borderColor: theme.palette.primary.main,
            bgcolor: theme.palette.action.hover,
          }
        }}
      >
        <CloudUploadIcon sx={{ fontSize: 48, color: isDragOver ? 'primary.main' : 'text.secondary', mb: 2 }} />
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Click to upload or drag and drop
        </Typography>
        <Typography variant="body2" color="text.secondary">
          SVG, PNG, JPG or GIF (max. 800x400px)
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
          Up to {maxFiles} images
        </Typography>
        <input
          type="file"
          hidden
          ref={fileInputRef}
          multiple
          accept="image/*"
          onChange={handleFileInput}
        />
      </Box>

      {images.length > 0 && (
        <Grid container spacing={2}>
          {images.map((file, idx) => {
            const objectUrl = URL.createObjectURL(file);
            return (
              <Grid size={{ xs: 6, sm: 4, md: 3 }} key={`${file.name}-${idx}`}>
                <Box
                  sx={{
                    position: 'relative',
                    paddingTop: '100%',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: `1px solid ${theme.palette.divider}`,
                    '&:hover .delete-overlay': {
                      opacity: 1,
                    }
                  }}
                >
                  <img
                    src={objectUrl}
                    alt="preview"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onLoad={() => URL.revokeObjectURL(objectUrl)}
                  />
                  <Box
                    className="delete-overlay"
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      bgcolor: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <IconButton size="small" sx={{ bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' } }} onClick={(e) => {
                      e.stopPropagation();
                      removeImage(idx);
                    }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}

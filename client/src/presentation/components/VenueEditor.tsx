import React from 'react';
import { Box, Typography, IconButton, TextField, Grid, Button } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';

export interface VenueData {
  name: string;
  walking: string;
  commute: string;
}

interface VenueEditorProps {
  title: string;
  venues: VenueData[];
  onChange: (venues: VenueData[]) => void;
}

const VenueEditor: React.FC<VenueEditorProps> = ({ title, venues, onChange }) => {
  const handleAdd = () => {
    onChange([...venues, { name: '', walking: '', commute: '' }]);
  };

  const handleRemove = (index: number) => {
    const updated = [...venues];
    updated.splice(index, 1);
    onChange(updated);
  };

  const handleChange = (index: number, field: keyof VenueData, value: string) => {
    const updated = [...venues];
    updated[index][field] = value;
    onChange(updated);
  };

  return (
    <Box mb={4}>
      <Typography variant="subtitle1" fontWeight="bold" mb={2} color="text.primary">
        {title}
      </Typography>
      {venues.map((venue, idx) => (
        <Grid container spacing={2} alignItems="center" key={idx} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              size="small"
              label="Name"
              value={venue.name}
              onChange={(e) => handleChange(idx, 'name', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="Walking Time (mins)"
              type="number"
              value={venue.walking}
              onChange={(e) => handleChange(idx, 'walking', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="Commute Time (mins)"
              type="number"
              value={venue.commute}
              onChange={(e) => handleChange(idx, 'commute', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }}>
            <IconButton color="error" onClick={() => handleRemove(idx)}>
              <DeleteIcon />
            </IconButton>
          </Grid>
        </Grid>
      ))}
      <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={handleAdd}>
        Add {title}
      </Button>
    </Box>
  );
};

export default VenueEditor;

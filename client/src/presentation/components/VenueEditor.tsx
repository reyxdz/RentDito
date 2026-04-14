import {
  Box,
  Typography,
  TextField,
  IconButton,
  Button,
  Grid,
  useTheme,
  Divider
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { Venue } from '../../domain/entities/Property';

export interface VenueEditorProps {
  title: string;
  description?: string;
  venues: Venue[];
  onChange: (venues: Venue[]) => void;
}

export default function VenueEditor({ title, description, venues, onChange }: VenueEditorProps) {
  const theme = useTheme();

  const handleAdd = () => {
    onChange([...venues, { name: '', walking: '', commute: '' }]);
  };

  const handleRemove = (index: number) => {
    onChange(venues.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof Venue, value: string) => {
    const updated = [...venues];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
      )}

      {venues.map((venue, idx) => (
        <Box 
          key={idx} 
          sx={{ 
            p: 2, 
            mb: 2, 
            borderRadius: 2, 
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.paper
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Name"
                value={venue.name}
                onChange={(e) => handleChange(idx, 'name', e.target.value)}
                placeholder="e.g. University of San Carlos"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Walking Time"
                value={venue.walking}
                onChange={(e) => handleChange(idx, 'walking', e.target.value)}
                placeholder="e.g. 5 minutes"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Commute Time"
                value={venue.commute}
                onChange={(e) => handleChange(idx, 'commute', e.target.value)}
                placeholder="e.g. 15 minutes"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <IconButton color="error" onClick={() => handleRemove(idx)} size="small" aria-label="Remove venue">
                <DeleteIcon />
              </IconButton>
            </Grid>
          </Grid>
        </Box>
      ))}

      <Button
        startIcon={<AddIcon />}
        variant="outlined"
        size="small"
        onClick={handleAdd}
        sx={{ fontWeight: 600, mt: 1 }}
      >
        Add Another {title}
      </Button>
      <Divider sx={{ mt: 3 }} />
    </Box>
  );
}

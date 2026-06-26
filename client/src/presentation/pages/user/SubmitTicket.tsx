import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Button,
  Grid,
  useTheme,
} from '@mui/material';
import { Send as SendIcon, ArrowBack as BackIcon } from '@mui/icons-material';

import PageHeader from '../../components/PageHeader';
import ImageUploader from '../../components/ImageUploader';
import { ticketService } from '../../../infrastructure/services/TicketService';
import { useAuth } from '../../../application/context/AuthContext';
import { useNotification } from '../../../application/context/NotificationContext';
import { getTenancyContext } from '../../utils/tenancyHelpers';

const CATEGORIES = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'structural', label: 'Structural' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'pest', label: 'Pest Control' },
  { value: 'other', label: 'Other' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low — Minor cosmetic or convenience issue' },
  { value: 'medium', label: 'Medium — Affects daily use but not urgent' },
  { value: 'high', label: 'High — Impairs basic living conditions' },
  { value: 'urgent', label: 'Urgent — Safety hazard or no utilities' },
];

export default function SubmitTicket() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const { tenancyId, propertyId = '', unitId = '' } = getTenancyContext(user?.activeTenancy);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('medium');
  const [images, setImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = title.trim().length > 0 && description.trim().length > 0 && category.length > 0;

  const handleSubmit = async () => {
    if (!isValid || !tenancyId) return;
    setIsSubmitting(true);
    try {
      const ticket = await ticketService.createTicket({
        tenancyId,
        propertyId,
        unitId,
        reportedByUserId: user?.id || '',
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        images: [], // In real implementation, images would be uploaded first
      });

      showNotification('Maintenance ticket submitted successfully!', 'success');
      navigate(`/u/maintenance/${ticket.id}`);
    } catch (error) {
      showNotification('Failed to submit ticket. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/u/maintenance')}
          sx={{ fontWeight: 600 }}
        >
          Back
        </Button>
        <PageHeader
          title="Report a Maintenance Issue"
          subtitle="Provide details about the issue so our team can help you"
        />
      </Box>

      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Grid container spacing={3}>
            {/* Title */}
            <Grid size={12}>
              <TextField
                label="Issue Title"
                placeholder="e.g. Leaking faucet in bathroom"
                fullWidth
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            {/* Category & Priority */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Category"
                fullWidth
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              >
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Priority"
                fullWidth
                required
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              >
                {PRIORITIES.map((p) => (
                  <MenuItem key={p.value} value={p.value}>
                    {p.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Description */}
            <Grid size={12}>
              <TextField
                label="Description"
                placeholder="Describe the issue in detail. When did it start? How often does it happen?"
                fullWidth
                required
                multiline
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            {/* Photo Upload */}
            <Grid size={12}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Attach Photos (optional)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Upload photos showing the issue to help our maintenance team diagnose the problem faster.
              </Typography>
              <ImageUploader images={images} onChange={setImages} maxFiles={5} />
            </Grid>
          </Grid>

          {/* Submit */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/u/maintenance')}
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              sx={{ borderRadius: 2, fontWeight: 600, px: 4 }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

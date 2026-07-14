import { Box, Typography, Chip, CircularProgress } from '@mui/material';
import type { TimeSlot } from '../../application/hooks/useVisits';

export interface TimeSlotPickerProps {
  slots: TimeSlot[];
  loading: boolean;
  selectedTime: string;
  onSelect: (time: string) => void;
}

export default function TimeSlotPicker({ slots, loading, selectedTime, onSelect }: TimeSlotPickerProps) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!slots.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        Select a date to view available time slots.
      </Typography>
    );
  }

  const availableSlots = slots.filter((s) => s.available);

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
        Available Slots ({availableSlots.length} of {slots.length})
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {slots.map((slot) => (
          <Chip
            key={slot.time}
            label={slot.time}
            clickable={slot.available}
            disabled={!slot.available}
            color={selectedTime === slot.time ? 'primary' : 'default'}
            variant={selectedTime === slot.time ? 'filled' : 'outlined'}
            onClick={() => slot.available && onSelect(slot.time)}
            sx={{
              fontWeight: 600,
              borderRadius: 2,
              px: 1,
              transition: 'all 0.2s',
              ...(slot.available && selectedTime !== slot.time && {
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'primary.50',
                },
              }),
              ...(!slot.available && {
                textDecoration: 'line-through',
                opacity: 0.5,
              }),
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

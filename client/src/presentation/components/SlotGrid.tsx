import { Box, Paper, Typography, Grid } from '@mui/material';
import { PersonOutline, Person } from '@mui/icons-material';
import type { Slot } from '../../domain/entities/Unit';

interface SlotGridProps {
  slots: Slot[];
  onSlotClick?: (slot: Slot) => void;
}

export default function SlotGrid({ slots, onSlotClick }: SlotGridProps) {
  return (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={2}>
        {slots.map((slot) => {
          const isOccupied = slot.status === 'occupied';
          return (
            <Grid 
              size={{ xs: 6, sm: 4, md: 3 }}
              key={slot.slotNumber}
            >
              <Paper
                elevation={0}
                onClick={() => onSlotClick && onSlotClick(slot)}
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: isOccupied ? 'error.light' : 'success.light',
                  bgcolor: isOccupied ? 'error.50' : 'success.50',
                  color: isOccupied ? 'error.dark' : 'success.dark',
                  cursor: onSlotClick ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  '&:hover': onSlotClick ? {
                    transform: 'translateY(-2px)',
                    boxShadow: 2,
                  } : {},
                }}
              >
                {isOccupied ? <Person fontSize="large" /> : <PersonOutline fontSize="large" />}
                <Typography variant="subtitle2" fontWeight={600}>
                  Slot {slot.slotNumber}
                </Typography>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>
                  {slot.status}
                </Typography>
                {isOccupied && slot.tenancy && (
                  <Typography variant="caption" sx={{ mt: 0.5, opacity: 0.8 }}>
                    Tenant #{slot.tenancyId?.slice(-4)}
                  </Typography>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

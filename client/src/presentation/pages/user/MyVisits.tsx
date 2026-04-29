import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, CircularProgress, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Divider, Slide,
} from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import React from 'react';
import { CalendarMonth, ChevronRight, HomeWork, Close, AccessTime, EventNote, Notes } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../application/context/AuthContext';
import { useVisits } from '../../../application/hooks/useVisits';
import type { Visit } from '../../../infrastructure/services/MockVisitService';
import { format } from 'date-fns';

const SlideUp = React.forwardRef(function SlideUp(
  props: TransitionProps & { children: React.ReactElement<any, any> },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function MyVisits() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { visits, loading, error, fetchVisits, cancelVisit } = useVisits(user?.id);
  const [selected, setSelected] = useState<Visit | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'info';
      case 'scheduled': return 'success';
      case 'completed': return 'default';
      case 'cancelled': return 'error';
      case 'no_show': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'no_show': return 'No Show';
      default: return status;
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 4, px: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <CalendarMonth color="primary" sx={{ fontSize: 32 }} />
        <Typography variant="h4" sx={{ fontWeight: 800 }}>My Visits</Typography>
      </Box>

      {loading && !visits.length ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : visits.length === 0 ? (
        <Card variant="outlined" sx={{ borderRadius: 3, borderStyle: 'dashed', borderWidth: 2, bgcolor: 'transparent' }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
            <CalendarMonth sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={600} gutterBottom>
              No Visit Requests
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
              You haven't scheduled any visits yet. Browse listings and schedule a viewing!
            </Typography>
            <Button variant="contained" onClick={() => navigate('/listings')} sx={{ mt: 3 }}>
              Browse Listings
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {visits.map((visit) => (
            <Card
              key={visit.id}
              variant="outlined"
              sx={{
                borderRadius: 3,
                transition: 'all 0.2s',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'primary.main',
                  transform: 'translateY(-2px)',
                  boxShadow: 2,
                },
              }}
              onClick={() => setSelected(visit)}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3, '&:last-child': { pb: 3 } }}>
                <Box
                  sx={{
                    width: 56, height: 56, borderRadius: 2, bgcolor: 'primary.50',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 3,
                  }}
                >
                  <HomeWork color="primary" />
                </Box>

                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {visit.propertyName}
                    </Typography>
                    <Chip
                      label={getStatusLabel(visit.status)}
                      size="small"
                      color={getStatusColor(visit.status) as any}
                      sx={{ textTransform: 'capitalize', fontWeight: 600, height: 20 }}
                    />
                  </Box>
                  {visit.unitIdentifier && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Unit: {visit.unitIdentifier}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {visit.scheduledDate
                      ? `Scheduled: ${format(new Date(visit.scheduledDate), 'MMM d, yyyy')} at ${visit.scheduledTime}`
                      : `Preferred: ${format(new Date(visit.preferredDate), 'MMM d, yyyy')} at ${visit.preferredTime}`}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                  <Chip
                    label={visit.purpose}
                    size="small"
                    variant="outlined"
                    sx={{ textTransform: 'capitalize', fontWeight: 600, height: 20 }}
                  />
                  <ChevronRight color="action" />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* ── Visit Detail Dialog ────────────────────────────────────── */}
      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        maxWidth="sm"
        fullWidth
        TransitionComponent={SlideUp}
        PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' } }}
      >
        {selected && (
          <>
            <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              Visit Details
              <IconButton onClick={() => setSelected(null)} edge="end" size="small" sx={{ bgcolor: 'action.hover' }}>
                <Close fontSize="small" />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 3 }}>
              {/* Property & Unit */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{
                  width: 48, height: 48, borderRadius: 2, bgcolor: 'primary.50',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <HomeWork color="primary" />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {selected.propertyName}
                  </Typography>
                  {selected.unitIdentifier && (
                    <Typography variant="body2" color="text.secondary">
                      Unit: {selected.unitIdentifier}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ ml: 'auto' }}>
                  <Chip
                    label={getStatusLabel(selected.status)}
                    color={getStatusColor(selected.status) as any}
                    sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                  />
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Details grid */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CalendarMonth sx={{ color: 'primary.main' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {selected.scheduledDate ? 'Scheduled Date' : 'Preferred Date'}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {format(new Date(selected.scheduledDate || selected.preferredDate), 'EEEE, MMMM d, yyyy')}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <AccessTime sx={{ color: 'primary.main' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {selected.scheduledTime ? 'Scheduled Time' : 'Preferred Time'}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {selected.scheduledTime || selected.preferredTime}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <EventNote sx={{ color: 'primary.main' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Purpose
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                      {selected.purpose}
                    </Typography>
                  </Box>
                </Box>

                {selected.notes && (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Notes sx={{ color: 'primary.main', mt: 0.25 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Notes
                      </Typography>
                      <Typography variant="body1">
                        {selected.notes}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">
                  Requested: {format(new Date(selected.createdAt), 'MMM d, yyyy h:mm a')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Updated: {format(new Date(selected.updatedAt), 'MMM d, yyyy h:mm a')}
                </Typography>
              </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, bgcolor: 'background.default' }}>
              {['pending', 'approved', 'scheduled'].includes(selected.status) && (
                <Button
                  color="error"
                  disabled={cancelling}
                  sx={{ fontWeight: 600, mr: 'auto' }}
                  onClick={async () => {
                    setCancelling(true);
                    try {
                      await cancelVisit(selected.id);
                      setSelected(null);
                    } catch {
                      // error is set in the hook
                    } finally {
                      setCancelling(false);
                    }
                  }}
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Request'}
                </Button>
              )}
              <Button onClick={() => setSelected(null)} color="inherit" sx={{ fontWeight: 600 }}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

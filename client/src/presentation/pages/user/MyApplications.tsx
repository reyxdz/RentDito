import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, CircularProgress, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Divider, Slide,
  TextField, Grid, Alert,
} from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import React from 'react';
import {
  Assignment, ChevronRight, HomeWork, Close, Person, Phone, School,
  LocationOn, ContactEmergency, Description, CheckCircle, Cancel, HourglassTop,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../application/context/AuthContext';
import { useApplications } from '../../../application/hooks/useApplications';
import type { RentalApplication } from '../../../infrastructure/services/MockApplicationService';
import { format } from 'date-fns';

const SlideUp = React.forwardRef(function SlideUp(
  props: TransitionProps & { children: React.ReactElement<any, any> },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function MyApplications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { applications, loading, error, fetchApplications, withdrawApplication } = useApplications(user?.id);
  const [selected, setSelected] = useState<RentalApplication | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'under_review': return 'info';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <HourglassTop fontSize="small" />;
      case 'under_review': return <Description fontSize="small" />;
      case 'approved': return <CheckCircle fontSize="small" />;
      case 'rejected': return <Cancel fontSize="small" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'under_review': return 'Under Review';
      default: return status;
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 4, px: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Assignment color="primary" sx={{ fontSize: 32 }} />
        <Typography variant="h4" sx={{ fontWeight: 800 }}>My Applications</Typography>
      </Box>

      {loading && !applications.length ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : applications.length === 0 ? (
        <Card variant="outlined" sx={{ borderRadius: 3, borderStyle: 'dashed', borderWidth: 2, bgcolor: 'transparent' }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
            <Assignment sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={600} gutterBottom>
              No Applications Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
              Ready to move in? Browse listings and apply for a unit you're interested in.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/listings')} sx={{ mt: 3 }}>
              Browse Listings
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {applications.map((app) => (
            <Card
              key={app.id}
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
              onClick={() => setSelected(app)}
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
                      {app.propertyName}
                    </Typography>
                    <Chip
                      icon={getStatusIcon(app.status) || undefined}
                      label={getStatusLabel(app.status)}
                      size="small"
                      color={getStatusColor(app.status) as any}
                      sx={{ textTransform: 'capitalize', fontWeight: 600, height: 24 }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Unit: {app.unitIdentifier}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Applied: {format(new Date(app.createdAt), 'MMM d, yyyy')}
                  </Typography>
                </Box>

                <ChevronRight color="action" />
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* ── Application Detail Dialog ──────────────────────────────── */}
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
              Application Details
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
                  <Typography variant="body2" color="text.secondary">
                    Unit: {selected.unitIdentifier}
                  </Typography>
                </Box>
                <Box sx={{ ml: 'auto' }}>
                  <Chip
                    icon={getStatusIcon(selected.status) || undefined}
                    label={getStatusLabel(selected.status)}
                    color={getStatusColor(selected.status) as any}
                    sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                  />
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Review Notes (if present) */}
              {selected.reviewNotes && (
                <Alert
                  severity={selected.status === 'approved' ? 'success' : selected.status === 'rejected' ? 'error' : 'info'}
                  sx={{ mb: 3, borderRadius: 2 }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Review Notes
                  </Typography>
                  <Typography variant="body2">{selected.reviewNotes}</Typography>
                  {selected.reviewedAt && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      Reviewed: {format(new Date(selected.reviewedAt), 'MMM d, yyyy h:mm a')}
                    </Typography>
                  )}
                </Alert>
              )}

              {/* Personal Details */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
                Personal Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Person sx={{ color: 'primary.main' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Full Name</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{selected.personalDetails.fullName}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Phone sx={{ color: 'primary.main' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Phone</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{selected.personalDetails.phone}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <School sx={{ color: 'primary.main' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Occupation</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {selected.personalDetails.occupation}
                      {selected.personalDetails.school && ` — ${selected.personalDetails.school}`}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <LocationOn sx={{ color: 'primary.main', mt: 0.25 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Address</Typography>
                    <Typography variant="body1">{selected.personalDetails.address}</Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Emergency Contact */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
                Emergency Contact
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <ContactEmergency sx={{ color: 'error.main' }} />
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selected.personalDetails.emergencyContact.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selected.personalDetails.emergencyContact.relation} — {selected.personalDetails.emergencyContact.phone}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Documents */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
                Submitted Documents
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                {selected.documents.map((doc, i) => (
                  <Chip
                    key={i}
                    icon={<Description fontSize="small" />}
                    label={doc}
                    variant="outlined"
                    size="small"
                    sx={{ fontWeight: 500 }}
                  />
                ))}
              </Box>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">
                  Applied: {format(new Date(selected.createdAt), 'MMM d, yyyy h:mm a')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Updated: {format(new Date(selected.updatedAt), 'MMM d, yyyy h:mm a')}
                </Typography>
              </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, bgcolor: 'background.default' }}>
              {['pending', 'under_review'].includes(selected.status) && (
                <Button
                  color="error"
                  disabled={withdrawing}
                  sx={{ fontWeight: 600, mr: 'auto' }}
                  onClick={async () => {
                    setWithdrawing(true);
                    try {
                      await withdrawApplication(selected.id);
                      setSelected(null);
                    } catch {
                      // error is set in the hook
                    } finally {
                      setWithdrawing(false);
                    }
                  }}
                >
                  {withdrawing ? 'Withdrawing...' : 'Withdraw Application'}
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

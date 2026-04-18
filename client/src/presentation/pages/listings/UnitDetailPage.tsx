import { useState } from 'react';
import type { ApplicationContext } from '../../components/ApplicationFormDialog';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircleOutline,
  GroupOutlined,
  MeetingRoomOutlined,
  Phone,
  Facebook,
  WarningAmberOutlined,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useUnitDetail } from '../../../application/hooks/useUnitDetail';
import { useAuth } from '../../../application/context/AuthContext';
import ImageCarousel from '../../components/ImageCarousel';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormDialog from '../../components/FormDialog';
import Navbar from '../../components/Navbar';
import { useInquiries } from '../../../application/hooks/useInquiries';
import { useVisits, useTimeSlots } from '../../../application/hooks/useVisits';
import TimeSlotPicker from '../../components/TimeSlotPicker';
import ApplicationFormDialog from '../../components/ApplicationFormDialog';

export default function UnitDetailPage() {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const { unit, loading, error } = useUnitDetail(unitId);
  const { user, isAuthenticated } = useAuth();

  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  const [inquiryDialogOpen, setInquiryDialogOpen] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Visit state
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [visitPurpose, setVisitPurpose] = useState<'viewing' | 'inspection'>('viewing');
  const [visitNotes, setVisitNotes] = useState('');
  const [visitError, setVisitError] = useState<string | null>(null);

  // Application state
  const [appDialogOpen, setAppDialogOpen] = useState(false);
  const [appContext, setAppContext] = useState<ApplicationContext | null>(null);

  const { createInquiry, loading: submittingInquiry } = useInquiries();
  const { createVisit, loading: submittingVisit } = useVisits();
  const { slots, loading: slotsLoading, fetchSlots } = useTimeSlots();

  const checkAuth = (): boolean => {
    if (!isAuthenticated) {
      setAuthDialogOpen(true);
      return false;
    }
    if (user?.verificationStatus !== 'verified') {
      if (user?.verificationStatus === 'pending') {
        setPendingDialogOpen(true);
      } else {
        navigate('/u/verify');
      }
      return false;
    }
    return true;
  };

  const handleInquireCTA = () => {
    if (!checkAuth()) return;
    setInquiryMessage('');
    setSubmitError(null);
    setInquiryDialogOpen(true);
  };

  const handleVisitCTA = () => {
    if (!checkAuth()) return;
    setVisitDate('');
    setVisitTime('');
    setVisitPurpose('viewing');
    setVisitNotes('');
    setVisitError(null);
    setVisitDialogOpen(true);
  };

  const handleApplyCTA = () => {
    if (!checkAuth()) return;
    if (!unit) return;
    setAppContext({
      propertyId: unit.propertyId,
      propertyName: unit.propertyId.replace('prop-', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      unitId: unit.id,
      unitIdentifier: unit.unitIdentifier,
    });
    setAppDialogOpen(true);
  };

  const handleDateChange = (date: string) => {
    setVisitDate(date);
    setVisitTime('');
    if (unit && date) {
      fetchSlots(unit.id, date);
    }
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryMessage.trim() || !user || !unit) return;

    try {
      const newInq = await createInquiry({
        propertyId: unit.propertyId,
        propertyName: unit.propertyId.replace('prop-', '').replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()), // Quick format
        unitId: unit.id,
        unitIdentifier: unit.unitIdentifier,
        userId: user.id,
        userName: user.name || 'User',
        initialMessage: inquiryMessage
      });
      setInquiryDialogOpen(false);
      navigate(`/u/inquiries/${newInq.id}`);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit inquiry');
    }
  };

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-PH').format(amount);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !unit) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 10 }}>
        <Typography color="error" variant="h5" gutterBottom>
          {error || 'Unit not found'}
        </Typography>
        <Button variant="contained" onClick={() => navigate('/listings')} sx={{ mt: 2 }}>
          Back to Listings
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: 4, flexGrow: 1 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ mb: 3, color: 'text.secondary', '&:hover': { bgcolor: 'transparent', color: 'primary.main' } }}
        >
          Back to Property
        </Button>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12 }}>
            {/* Unit Images with External Arrows */}
            <Box sx={{ mb: 4, maxWidth: 1000, mx: 'auto' }}>
              <ImageCarousel
                images={unit.images}
                height={{ xs: 300, sm: 400, md: 500 }}
                borderRadius={16}
                arrowPosition="outside"
              />
            </Box>

            {/* Unit Details */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, fontSize: { xs: '2rem', sm: '3rem' } }}>
                    {unit.unitIdentifier}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={unit.accommodationType === 'room' ? 'Room for Rent' : 'Bedspace'}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 700, borderRadius: 1 }}
                    />
                    {unit.status === 'vacant' ? (
                      <Chip
                        label={`${unit.capacity} capacity`}
                        size="small"
                        color="success"
                        sx={{ fontWeight: 700, borderRadius: 1 }}
                      />
                    ) : (
                      <Chip
                        label={unit.status}
                        size="small"
                        color="error"
                        sx={{ fontWeight: 700, borderRadius: 1, textTransform: 'capitalize' }}
                      />
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', sm: 'flex-end' } }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 1, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    Monthly
                  </Typography>
                  {unit.bedspaceRent || unit.roomRent ? (
                    <>
                      {unit.bedspaceRent && (
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                          <Typography variant="h4" color="primary.main" sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', sm: '2.125rem' }, lineHeight: 1 }}>
                            ₱{formatPrice(unit.bedspaceRent)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}> per head</Typography>
                        </Box>
                      )}
                      {unit.roomRent && (
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: unit.bedspaceRent ? 1 : 0 }}>
                          {unit.bedspaceRent && (
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mr: 0.5 }}>or</Typography>
                          )}
                          <Typography variant={unit.bedspaceRent ? "h6" : "h4"} color={unit.bedspaceRent ? "text.primary" : "primary.main"} sx={{ fontWeight: 800, lineHeight: 1 }}>
                            ₱{formatPrice(unit.roomRent)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}> per room</Typography>
                        </Box>
                      )}
                    </>
                  ) : (
                    <Typography variant="h4" color="primary.main" sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                      ₱0
                    </Typography>
                  )}
                  <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                    <Button variant="outlined" color="primary" onClick={handleInquireCTA}>Inquire</Button>
                    <Button variant="contained" color="primary" disableElevation onClick={handleVisitCTA}>Schedule Visit</Button>
                    {unit.status === 'vacant' && (
                      <Button variant="contained" color="success" disableElevation onClick={handleApplyCTA}>
                        Apply Now
                      </Button>
                    )}
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Capacity & Features */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card variant="outlined" sx={{ borderRadius: 2, border: 'none', bgcolor: 'background.default', p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <GroupOutlined sx={{ fontSize: 32, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Capacity
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {unit.capacity} person{unit.capacity > 1 ? 's' : ''}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card variant="outlined" sx={{ borderRadius: 2, border: 'none', bgcolor: 'background.default', p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <MeetingRoomOutlined sx={{ fontSize: 32, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Max Occupants
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {unit.maxOccupants}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>
              </Grid>

              <Grid container spacing={3}>
                {/* Features & Inclusions Card */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined" sx={{ borderRadius: 3, height: '100%', border: 'none', bgcolor: 'background.default' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Additional Information</Typography>
                      <List dense disablePadding>
                        {unit.features.map((item, i) => (
                          <ListItem key={i} disablePadding sx={{ mb: 1 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <CheckCircleOutline color="success" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={item} primaryTypographyProps={{ variant: 'body2' }} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Inquire Us Card */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined" sx={{ borderRadius: 3, height: '100%', border: 'none', bgcolor: 'background.default' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Inquire Us</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Phone */}
                        <Box
                          component="a"
                          href="tel:+639123456789"
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: 'action.hover',
                            textDecoration: 'none',
                            color: '#fff',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: 'primary.main',
                              color: '#fff',
                              transform: 'translateX(4px)',
                            },
                          }}
                        >
                          <Phone sx={{ fontSize: 24, color: 'inherit', flexShrink: 0 }} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              Call Us
                            </Typography>
                            <Typography variant="caption">
                              +63 (912) 345-6789
                            </Typography>
                          </Box>
                        </Box>

                        {/* Facebook */}
                        <Box
                          component="a"
                          href="https://facebook.com/rentdito"
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: 'action.hover',
                            textDecoration: 'none',
                            color: '#fff',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: 'primary.main',
                              color: '#fff',
                              transform: 'translateX(4px)',
                            },
                          }}
                        >
                          <Facebook sx={{ fontSize: 24, color: 'inherit', flexShrink: 0 }} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              Message on Facebook
                            </Typography>
                            <Typography variant="caption">
                              RentDito
                            </Typography>
                          </Box>
                        </Box>
                        {/* Safety Reminder */}
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'warning.dark', bgcolor: 'rgba(255, 152, 0, 0.05)', mt: 1 }}>
                          <WarningAmberOutlined sx={{ color: 'warning.main', mt: 0.25 }} />
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'warning.main', mb: 0.5, lineHeight: 1.2 }}>
                              Safety Reminder
                            </Typography>
                            <Typography variant="body2" color="warning.light">
                              For your safety, never send any advance payments or deposits before personally inspecting the property and verifying details with the landlord.
                            </Typography>
                          </Box>
                        </Box>

                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <Box component="footer" sx={{ py: 3, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', mt: 'auto' }}>
        <Typography variant="caption" color="text.secondary">
          © {new Date().getFullYear()} RentDito. All rights reserved.
        </Typography>
      </Box>

      {/* ── Dialogs ────────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={authDialogOpen}
        title="Authentication Required"
        message="Please log in first to inquire or schedule a visit for this property."
        confirmText="Go to Login"
        cancelText="Cancel"
        onConfirm={() => navigate('/login')}
        onCancel={() => setAuthDialogOpen(false)}
      />
      <ConfirmDialog
        open={pendingDialogOpen}
        title="Verification Pending"
        message="Your account verification is currently pending review. Please wait for approval before making inquiries."
        confirmText="Okay"
        cancelText="Go to Verification"
        onConfirm={() => setPendingDialogOpen(false)}
        onCancel={() => navigate('/u/verify')}
      />

      <FormDialog
        open={inquiryDialogOpen}
        title="Submit Inquiry"
        submitText="Send Inquiry"
        loading={submittingInquiry}
        onClose={() => setInquiryDialogOpen(false)}
        onSubmit={handleInquirySubmit}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          You're inquiring about <strong>{unit?.unitIdentifier}</strong>. The landlord will receive your message and respond shortly.
        </Typography>

        {submitError && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>{submitError}</Typography>
        )}

        <TextField
          fullWidth
          label="Your Message"
          multiline
          rows={4}
          variant="outlined"
          value={inquiryMessage}
          onChange={(e) => setInquiryMessage(e.target.value)}
          placeholder={`Hi! I'm interested in ${unit?.unitIdentifier}. Is this still available?`}
          required
        />
      </FormDialog>

      {/* ── Visit Request Dialog ──────────────────────────────────────── */}
      <FormDialog
        open={visitDialogOpen}
        title="Schedule a Visit"
        submitText="Request Visit"
        loading={submittingVisit}
        onClose={() => setVisitDialogOpen(false)}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!visitDate) {
            setVisitError('Please select a preferred date.');
            return;
          }
          if (!visitTime) {
            setVisitError('Please select an available time slot.');
            return;
          }
          if (!user || !unit) return;

          try {
            await createVisit({
              propertyId: unit.propertyId,
              propertyName: unit.propertyId.replace('prop-', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              unitId: unit.id,
              unitIdentifier: unit.unitIdentifier,
              userId: user.id,
              userName: user.name || 'User',
              preferredDate: visitDate,
              preferredTime: visitTime,
              purpose: visitPurpose,
              notes: visitNotes || undefined,
            });
            setVisitDialogOpen(false);
            navigate('/u/bookings');
          } catch (err: any) {
            setVisitError(err.message || 'Failed to submit visit request');
          }
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Schedule a visit for <strong>{unit?.unitIdentifier}</strong>. Pick your preferred date and time.
        </Typography>

        {visitError && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>{visitError}</Typography>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            fullWidth
            label="Preferred Date"
            type="date"
            value={visitDate}
            onChange={(e) => handleDateChange(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            inputProps={{ min: new Date().toISOString().slice(0, 10) }}
            required
            sx={{
              '& input::-webkit-calendar-picker-indicator': {
                filter: 'invert(1)',
                cursor: 'pointer',
              },
            }}
          />

          <TimeSlotPicker
            slots={slots}
            loading={slotsLoading}
            selectedTime={visitTime}
            onSelect={setVisitTime}
          />

          <TextField
            fullWidth
            select
            label="Purpose"
            value={visitPurpose}
            onChange={(e) => setVisitPurpose(e.target.value as 'viewing' | 'inspection')}
          >
            <MenuItem value="viewing">Property Viewing</MenuItem>
            <MenuItem value="inspection">Unit Inspection</MenuItem>
          </TextField>

          <TextField
            fullWidth
            label="Notes (optional)"
            multiline
            rows={3}
            value={visitNotes}
            onChange={(e) => setVisitNotes(e.target.value)}
            placeholder="Any special requests or questions?"
          />
        </Box>
      </FormDialog>

      {/* ── Application Form Dialog ─────────────────────────────────── */}
      <ApplicationFormDialog
        open={appDialogOpen}
        onClose={() => setAppDialogOpen(false)}
        context={appContext}
        onSuccess={() => navigate('/u/applications')}
      />
    </Box>
  );
}

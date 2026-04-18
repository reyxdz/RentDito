import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, CircularProgress,
  TextField, Divider, Avatar, MenuItem,
  Card, CardContent, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, Alert,
} from '@mui/material';
import {
  ArrowBack,
  Person as PersonIcon,
  Home as PropertyIcon,
  MeetingRoom as UnitIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
  CheckCircle as CompleteIcon,
  Cancel as CancelIcon,
  PersonOff as NoShowIcon,
  Schedule as ScheduleIcon,
  AssignmentInd as AssignIcon,
  ThumbUp as ApproveIcon,
  EventNote as BookingIcon,
  Notes as NotesIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useVisitDetail } from '../../../../application/hooks/useVisits';
import { apiClient } from '../../../../infrastructure/api/apiClient';
import { ENDPOINTS } from '../../../../infrastructure/api/endpoints';
import type { VisitStatus } from '../../../../domain/entities/VisitRequest';

/** Visit status config for color-coded display */
const STATUS_CONFIG: Record<VisitStatus, { label: string; color: string; icon: typeof CompleteIcon }> = {
  pending: { label: 'Pending', color: '#f59e0b', icon: ScheduleIcon },
  approved: { label: 'Approved', color: '#3b82f6', icon: ApproveIcon },
  scheduled: { label: 'Scheduled', color: '#6366f1', icon: CalendarIcon },
  completed: { label: 'Completed', color: '#10b981', icon: CompleteIcon },
  cancelled: { label: 'Cancelled', color: '#6b7280', icon: CancelIcon },
  no_show: { label: 'No Show', color: '#ef4444', icon: NoShowIcon },
};

function formatDate(date?: string | Date): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShortDate(date?: string | Date): string {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
}

export default function VisitDetail() {
  const { visitId } = useParams<{ visitId: string }>();
  const navigate = useNavigate();
  const {
    visit,
    loading,
    error,
    fetchVisit,
    approve,
    schedule,
    assign,
    complete,
    cancel,
    noShow,
    updateNotes,
  } = useVisitDetail(visitId);

  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  // Schedule dialog state
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduling, setScheduling] = useState(false);

  // Assign dialog state
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Notes state
  const [notes, setNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  // Action loading states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
    color: string;
  }>({ open: false, title: '', message: '', action: async () => {}, color: '' });

  // Fetch visit on mount
  useEffect(() => {
    fetchVisit();
  }, [fetchVisit]);

  // Fetch staff members
  useEffect(() => {
    async function fetchStaff() {
      setStaffLoading(true);
      try {
        const { data } = await apiClient.get(ENDPOINTS.TEAM.ROOT);
        setStaffMembers(data.data || data || []);
      } catch {
        // Staff list may not be available
      } finally {
        setStaffLoading(false);
      }
    }
    fetchStaff();
  }, []);

  // Sync notes from visit
  useEffect(() => {
    if (visit?.notes) setNotes(visit.notes);
  }, [visit?.notes]);

  const handleApprove = () => {
    setConfirmDialog({
      open: true,
      title: 'Approve Visit',
      message: 'Are you sure you want to approve this visit request? The visitor will be notified.',
      color: '#3b82f6',
      action: async () => {
        setActionLoading('approve');
        try {
          await approve();
        } finally {
          setActionLoading(null);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      },
    });
  };

  const handleSchedule = async () => {
    if (!scheduleDate || !scheduleTime) return;
    setScheduling(true);
    try {
      await schedule({ scheduledDate: scheduleDate, scheduledTime: scheduleTime });
      setScheduleOpen(false);
    } catch (err) {
      console.error('Failed to schedule:', err);
    } finally {
      setScheduling(false);
    }
  };

  const handleAssignStaff = async () => {
    if (!selectedStaffId) return;
    setAssigning(true);
    try {
      await assign(selectedStaffId);
      setAssignOpen(false);
    } catch (err) {
      console.error('Failed to assign:', err);
    } finally {
      setAssigning(false);
    }
  };

  const handleComplete = () => {
    setConfirmDialog({
      open: true,
      title: 'Complete Visit',
      message: 'Mark this visit as completed? This cannot be undone.',
      color: '#10b981',
      action: async () => {
        setActionLoading('complete');
        try {
          await complete();
        } finally {
          setActionLoading(null);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      },
    });
  };

  const handleCancel = () => {
    setConfirmDialog({
      open: true,
      title: 'Cancel Visit',
      message: 'Are you sure you want to cancel this visit? The visitor will be notified.',
      color: '#6b7280',
      action: async () => {
        setActionLoading('cancel');
        try {
          await cancel();
        } finally {
          setActionLoading(null);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      },
    });
  };

  const handleNoShow = () => {
    setConfirmDialog({
      open: true,
      title: 'Mark No-Show',
      message: 'Mark this visitor as a no-show? This indicates they did not attend the scheduled visit.',
      color: '#ef4444',
      action: async () => {
        setActionLoading('no_show');
        try {
          await noShow();
        } finally {
          setActionLoading(null);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      },
    });
  };

  const handleSaveNotes = async () => {
    setNotesSaving(true);
    setNotesSaved(false);
    try {
      await updateNotes(notes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setNotesSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !visit) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/hub/bookings')} sx={{ mb: 2 }}>
          Back to Visits
        </Button>
        <Typography color="error">{error || 'Visit not found'}</Typography>
      </Box>
    );
  }

  const visitUser = visit.user as any;
  const visitProperty = visit.property as any;
  const visitUnit = visit.unit as any;
  const visitStaff = visit.assignedStaff as any;
  const statusConfig = STATUS_CONFIG[visit.status] || { label: visit.status, color: '#6b7280', icon: ScheduleIcon };
  const StatusIcon = statusConfig.icon;

  const isTerminal = ['completed', 'cancelled', 'no_show'].includes(visit.status);
  const canApprove = visit.status === 'pending';
  const canSchedule = ['pending', 'approved'].includes(visit.status);
  const canAssign = !isTerminal;
  const canComplete = ['approved', 'scheduled'].includes(visit.status);
  const canCancel = !isTerminal;
  const canMarkNoShow = ['approved', 'scheduled'].includes(visit.status);

  return (
    <Box>
      {/* Back Navigation */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/hub/bookings')}
        sx={{ mb: 3, fontWeight: 600 }}
      >
        Back to Visits
      </Button>

      {/* Status Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? `linear-gradient(135deg, ${statusConfig.color}12 0%, ${statusConfig.color}06 100%)`
              : `linear-gradient(135deg, ${statusConfig.color}08 0%, ${statusConfig.color}04 100%)`,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          {/* Left: Visit Info */}
          <Box sx={{ flex: 1, minWidth: 280 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${statusConfig.color}30, ${statusConfig.color}60)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <StatusIcon sx={{ color: statusConfig.color, fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800}>
                  Visit Request
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.75,
                      px: 2,
                      py: 0.5,
                      borderRadius: 2,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: statusConfig.color,
                      bgcolor: `${statusConfig.color}18`,
                      border: `1px solid ${statusConfig.color}30`,
                    }}
                  >
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: statusConfig.color, boxShadow: `0 0 8px ${statusConfig.color}60` }} />
                    {statusConfig.label}
                  </Box>
                  {visit.purpose && (
                    <Chip
                      label={visit.purpose === 'viewing' ? 'Property Viewing' : 'Inspection'}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                    />
                  )}
                </Box>
              </Box>
            </Box>

            {/* Meta Info */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 2 }}>
              {/* Visitor */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar
                  src={visitUser?.avatar}
                  sx={{ width: 36, height: 36, bgcolor: '#f59e0b', fontSize: '0.85rem', fontWeight: 700 }}
                >
                  {visitUser?.name?.charAt(0) || <PersonIcon fontSize="small" />}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{visitUser?.name || 'Unknown'}</Typography>
                  <Typography variant="caption" color="text.secondary">{visitUser?.email || ''}</Typography>
                </Box>
              </Box>

              {/* Property */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PropertyIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {visitProperty?.name || 'Unknown Property'}
                </Typography>
              </Box>

              {/* Unit */}
              {visitUnit && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <UnitIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {visitUnit?.unitIdentifier || '—'}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Right: Actions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 200 }}>
            {canApprove && (
              <Button
                variant="contained"
                startIcon={actionLoading === 'approve' ? <CircularProgress size={16} color="inherit" /> : <ApproveIcon />}
                onClick={handleApprove}
                disabled={!!actionLoading}
                sx={{
                  bgcolor: '#3b82f6',
                  '&:hover': { bgcolor: '#2563eb' },
                  fontWeight: 700,
                  borderRadius: 2,
                  textTransform: 'none',
                }}
              >
                Approve
              </Button>
            )}
            {canSchedule && (
              <Button
                variant="outlined"
                startIcon={<ScheduleIcon />}
                onClick={() => {
                  setScheduleDate(formatShortDate(visit.requestedDate));
                  setScheduleTime(visit.requestedTime || '10:00');
                  setScheduleOpen(true);
                }}
                disabled={!!actionLoading}
                sx={{ fontWeight: 600, borderRadius: 2, textTransform: 'none' }}
              >
                Schedule
              </Button>
            )}
            {canAssign && (
              <Button
                variant="outlined"
                startIcon={<AssignIcon />}
                onClick={() => setAssignOpen(true)}
                disabled={!!actionLoading}
                sx={{ fontWeight: 600, borderRadius: 2, textTransform: 'none' }}
              >
                Assign Staff
              </Button>
            )}
            {canComplete && (
              <Button
                variant="contained"
                startIcon={actionLoading === 'complete' ? <CircularProgress size={16} color="inherit" /> : <CompleteIcon />}
                onClick={handleComplete}
                disabled={!!actionLoading}
                sx={{
                  bgcolor: '#10b981',
                  '&:hover': { bgcolor: '#059669' },
                  fontWeight: 700,
                  borderRadius: 2,
                  textTransform: 'none',
                }}
              >
                Complete
              </Button>
            )}
            {canCancel && (
              <Button
                variant="outlined"
                color="inherit"
                startIcon={actionLoading === 'cancel' ? <CircularProgress size={16} /> : <CancelIcon />}
                onClick={handleCancel}
                disabled={!!actionLoading}
                sx={{ fontWeight: 600, borderRadius: 2, textTransform: 'none', color: 'text.secondary' }}
              >
                Cancel
              </Button>
            )}
            {canMarkNoShow && (
              <Button
                variant="outlined"
                color="error"
                startIcon={actionLoading === 'no_show' ? <CircularProgress size={16} color="error" /> : <NoShowIcon />}
                onClick={handleNoShow}
                disabled={!!actionLoading}
                sx={{ fontWeight: 600, borderRadius: 2, textTransform: 'none' }}
              >
                No-Show
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Detail Cards */}
      <Grid container spacing={3}>
        {/* Request Info */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 4,
              height: '100%',
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: '0 4px 24px rgba(0,0,0,0.06)' },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: 'rgba(245, 158, 11, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BookingIcon sx={{ fontSize: 20, color: '#f59e0b' }} />
                </Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Request Information
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <InfoRow icon={<CalendarIcon fontSize="small" />} label="Requested Date" value={formatDate(visit.requestedDate)} />
                <InfoRow icon={<TimeIcon fontSize="small" />} label="Requested Time" value={visit.requestedTime || '—'} />
                <InfoRow icon={<CalendarIcon fontSize="small" />} label="Scheduled Date" value={formatDate(visit.scheduledDate)} highlight={!!visit.scheduledDate} />
                <InfoRow icon={<TimeIcon fontSize="small" />} label="Scheduled Time" value={visit.scheduledTime || '—'} highlight={!!visit.scheduledTime} />
                <Divider />
                <InfoRow
                  icon={<PersonIcon fontSize="small" />}
                  label="Visitor"
                  value={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{visitUser?.name || 'Unknown'}</Typography>
                      <Typography variant="caption" color="text.secondary">{visitUser?.email || ''}</Typography>
                      {visitUser?.phone && <Typography variant="caption" color="text.secondary" display="block">{visitUser.phone}</Typography>}
                    </Box>
                  }
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Assignment & Status */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 4,
              height: '100%',
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: '0 4px 24px rgba(0,0,0,0.06)' },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: 'rgba(99, 102, 241, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AssignIcon sx={{ fontSize: 20, color: '#6366f1' }} />
                </Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Assignment & Property
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <InfoRow
                  icon={<AssignIcon fontSize="small" />}
                  label="Assigned Staff"
                  value={
                    visitStaff ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: '#6366f1', fontSize: '0.75rem' }}>
                          {visitStaff.name?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{visitStaff.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{visitStaff.positionName || 'Staff'}</Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.disabled" fontStyle="italic">
                        Not assigned
                      </Typography>
                    )
                  }
                />
                <Divider />
                <InfoRow
                  icon={<PropertyIcon fontSize="small" />}
                  label="Property"
                  value={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{visitProperty?.name || 'Unknown'}</Typography>
                      {visitProperty?.address && (
                        <Typography variant="caption" color="text.secondary">
                          {[visitProperty.address.street, visitProperty.address.barangay, visitProperty.address.city].filter(Boolean).join(', ')}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                {visitUnit && (
                  <InfoRow
                    icon={<UnitIcon fontSize="small" />}
                    label="Unit"
                    value={
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{visitUnit.unitIdentifier}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {visitUnit.accommodationType === 'bedspace' ? 'Bedspace' : 'Room'}
                          {visitUnit.roomRent ? ` • ₱${Number(visitUnit.roomRent).toLocaleString()}/mo` : ''}
                        </Typography>
                      </Box>
                    }
                  />
                )}
                <Divider />
                <InfoRow label="Created" value={formatDate(visit.createdAt)} />
                <InfoRow label="Last Updated" value={formatDate(visit.updatedAt)} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Notes Section */}
        <Grid size={{ xs: 12 }}>
          <Card variant="outlined" sx={{ borderRadius: 4 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      bgcolor: 'rgba(16, 185, 129, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <NotesIcon sx={{ fontSize: 20, color: '#10b981' }} />
                  </Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Notes
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {notesSaved && (
                    <Typography variant="caption" color="success.main" fontWeight={600}>
                      ✓ Saved
                    </Typography>
                  )}
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={notesSaving ? <CircularProgress size={14} /> : <SaveIcon />}
                    onClick={handleSaveNotes}
                    disabled={notesSaving || isTerminal}
                    sx={{ fontWeight: 600, borderRadius: 2, textTransform: 'none' }}
                  >
                    Save Notes
                  </Button>
                </Box>
              </Box>
              <TextField
                fullWidth
                multiline
                minRows={3}
                maxRows={8}
                placeholder="Add notes about this visit (e.g., special instructions, observations)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isTerminal}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    bgcolor: 'background.paper',
                  },
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Schedule Dialog */}
      <Dialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Schedule Visit</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <TextField
              label="Date"
              type="date"
              fullWidth
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Time"
              type="time"
              fullWidth
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setScheduleOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSchedule}
            disabled={scheduling || !scheduleDate || !scheduleTime}
            sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
          >
            {scheduling ? <CircularProgress size={20} color="inherit" /> : 'Confirm Schedule'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Staff Dialog */}
      <Dialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Assign Staff</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {staffLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : staffMembers.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                No staff members available. Add staff in Team Management.
              </Alert>
            ) : (
              <TextField
                select
                fullWidth
                label="Select Staff Member"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
              >
                {staffMembers.map((staff: any) => (
                  <MenuItem key={staff._id || staff.id} value={staff._id || staff.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: '#6366f1', fontSize: '0.7rem' }}>
                        {staff.name?.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{staff.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{staff.positionName || 'Staff'}</Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setAssignOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAssignStaff}
            disabled={assigning || !selectedStaffId}
            sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
          >
            {assigning ? <CircularProgress size={20} color="inherit" /> : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {confirmDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={confirmDialog.action}
            disabled={!!actionLoading}
            sx={{
              bgcolor: confirmDialog.color,
              '&:hover': { bgcolor: confirmDialog.color, filter: 'brightness(0.9)' },
              fontWeight: 700,
              borderRadius: 2,
              textTransform: 'none',
            }}
          >
            {actionLoading ? <CircularProgress size={20} color="inherit" /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/** Reusable info row for detail cards */
function InfoRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
      {icon && (
        <Box sx={{ color: 'text.secondary', mt: 0.25, flexShrink: 0 }}>{icon}</Box>
      )}
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
          {label}
        </Typography>
        <Box sx={{ mt: 0.25, color: highlight ? 'primary.main' : 'text.primary' }}>
          {typeof value === 'string' ? (
            <Typography variant="body2" fontWeight={highlight ? 600 : 400}>{value}</Typography>
          ) : (
            value
          )}
        </Box>
      </Box>
    </Box>
  );
}

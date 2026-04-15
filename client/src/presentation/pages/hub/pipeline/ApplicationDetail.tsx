import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, CircularProgress,
  TextField, Divider, Avatar, Card, CardContent, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, Alert, Link,
} from '@mui/material';
import {
  ArrowBack,
  Person as PersonIcon,
  Home as PropertyIcon,
  MeetingRoom as UnitIcon,
  Phone as PhoneIcon,
  Work as WorkIcon,
  ContactEmergency as EmergencyIcon,
  LocationOn as AddressIcon,
  Description as DocIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  RateReview as ReviewIcon,
  InsertDriveFile as FileIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { useApplicationDetail } from '../../../../application/hooks/useApplications';
import type { ApplicationStatus } from '../../../../domain/entities/RentalApplication';

/** Application status config */
const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: '#f59e0b' },
  under_review: { label: 'Under Review', color: '#6366f1' },
  approved: { label: 'Approved', color: '#10b981' },
  rejected: { label: 'Rejected', color: '#ef4444' },
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

export default function ApplicationDetail() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const {
    application,
    loading,
    error,
    fetchApplication,
    review,
    approve,
    reject,
  } = useApplicationDetail(applicationId);

  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reject dialog
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  // Approve dialog
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveNotes, setApproveNotes] = useState('');

  // Document viewer
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);

  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);

  useEffect(() => {
    if (application?.reviewNotes) setReviewNotes(application.reviewNotes);
  }, [application?.reviewNotes]);

  const handleReview = async () => {
    setActionLoading('review');
    try {
      await review(reviewNotes);
    } catch (err) {
      console.error('Failed to start review:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async () => {
    setActionLoading('approve');
    try {
      await approve(approveNotes);
      setApproveOpen(false);
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectNotes.trim()) return;
    setActionLoading('reject');
    try {
      await reject(rejectNotes);
      setRejectOpen(false);
    } catch (err) {
      console.error('Failed to reject:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !application) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/hub/pipeline/applications')} sx={{ mb: 2 }}>
          Back to Applications
        </Button>
        <Typography color="error">{error || 'Application not found'}</Typography>
      </Box>
    );
  }

  const appUser = application.user as any;
  const appProperty = application.property as any;
  const appUnit = application.unit as any;
  const pd = application.personalDetails;
  const statusConfig = STATUS_CONFIG[application.status] || { label: application.status, color: '#6b7280' };

  const isTerminal = ['approved', 'rejected'].includes(application.status);
  const canReview = application.status === 'pending';
  const canApprove = ['pending', 'under_review'].includes(application.status);
  const canReject = ['pending', 'under_review'].includes(application.status);

  return (
    <Box>
      {/* Back Navigation */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/hub/pipeline/applications')}
        sx={{ mb: 3, fontWeight: 600 }}
      >
        Back to Applications
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
          {/* Left: Summary */}
          <Box sx={{ flex: 1, minWidth: 280 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar
                src={appUser?.avatar}
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: '#6366f1',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                }}
              >
                {(pd?.fullName || appUser?.name || 'U').charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={800}>
                  {pd?.fullName || appUser?.name || 'Unknown Applicant'}
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
                </Box>
              </Box>
            </Box>

            {/* Quick meta */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PropertyIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {appProperty?.name || 'Unknown Property'}
                </Typography>
              </Box>
              {appUnit && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <UnitIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {appUnit?.unitIdentifier || '—'}
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Applied {formatDate(application.createdAt)}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Right: Action Buttons */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 180 }}>
            {canReview && (
              <Button
                variant="outlined"
                startIcon={actionLoading === 'review' ? <CircularProgress size={16} /> : <ReviewIcon />}
                onClick={handleReview}
                disabled={!!actionLoading}
                sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
              >
                Start Review
              </Button>
            )}
            {canApprove && (
              <Button
                variant="contained"
                startIcon={actionLoading === 'approve' ? <CircularProgress size={16} color="inherit" /> : <ApproveIcon />}
                onClick={() => setApproveOpen(true)}
                disabled={!!actionLoading}
                sx={{
                  bgcolor: '#10b981',
                  '&:hover': { bgcolor: '#059669' },
                  fontWeight: 700,
                  borderRadius: 2,
                  textTransform: 'none',
                }}
              >
                Approve
              </Button>
            )}
            {canReject && (
              <Button
                variant="outlined"
                color="error"
                startIcon={actionLoading === 'reject' ? <CircularProgress size={16} color="error" /> : <RejectIcon />}
                onClick={() => setRejectOpen(true)}
                disabled={!!actionLoading}
                sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
              >
                Reject
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Detail Cards */}
      <Grid container spacing={3}>
        {/* Applicant Profile */}
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
                  <PersonIcon sx={{ fontSize: 20, color: '#6366f1' }} />
                </Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Applicant Profile
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <InfoRow icon={<PersonIcon fontSize="small" />} label="Full Name" value={pd?.fullName || '—'} />
                <InfoRow icon={<PhoneIcon fontSize="small" />} label="Phone" value={pd?.phone || '—'} />
                <InfoRow icon={<WorkIcon fontSize="small" />} label="Occupation" value={pd?.occupation || '—'} />
                {pd?.school && <InfoRow icon={<WorkIcon fontSize="small" />} label="School" value={pd.school} />}
                <InfoRow icon={<AddressIcon fontSize="small" />} label="Address" value={pd?.address || '—'} />
                <Divider />
                <InfoRow
                  icon={<EmergencyIcon fontSize="small" />}
                  label="Emergency Contact"
                  value={pd?.emergencyContact || '—'}
                  highlight
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Unit Info */}
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
                    bgcolor: 'rgba(16, 185, 129, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UnitIcon sx={{ fontSize: 20, color: '#10b981' }} />
                </Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Unit Information
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <InfoRow icon={<PropertyIcon fontSize="small" />} label="Property" value={appProperty?.name || '—'} />
                {appProperty?.address && (
                  <InfoRow
                    icon={<AddressIcon fontSize="small" />}
                    label="Location"
                    value={[appProperty.address.street, appProperty.address.barangay, appProperty.address.city].filter(Boolean).join(', ')}
                  />
                )}
                <Divider />
                <InfoRow icon={<UnitIcon fontSize="small" />} label="Unit" value={appUnit?.unitIdentifier || '—'} />
                <InfoRow
                  label="Type"
                  value={
                    <Chip
                      label={appUnit?.accommodationType === 'bedspace' ? 'Bedspace' : 'Room'}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  }
                />
                <InfoRow
                  label="Rent"
                  value={
                    appUnit?.roomRent
                      ? `₱${Number(appUnit.roomRent).toLocaleString()}/mo`
                      : appUnit?.bedspaceRent
                        ? `₱${Number(appUnit.bedspaceRent).toLocaleString()}/bed/mo`
                        : '—'
                  }
                  highlight
                />
                {appUnit?.deposit && (
                  <InfoRow label="Deposit" value={`₱${Number(appUnit.deposit).toLocaleString()}`} />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Documents */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 4,
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
                  <DocIcon sx={{ fontSize: 20, color: '#f59e0b' }} />
                </Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Uploaded Documents
                </Typography>
              </Box>

              {application.documents && application.documents.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {application.documents.map((doc, idx) => {
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc);
                    return (
                      <Box
                        key={idx}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          p: 2,
                          borderRadius: 3,
                          border: '1px solid',
                          borderColor: 'divider',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          '&:hover': {
                            bgcolor: 'action.hover',
                            borderColor: 'primary.main',
                            transform: 'translateX(4px)',
                          },
                        }}
                        onClick={() => isImage ? setViewingDoc(doc) : window.open(doc, '_blank')}
                      >
                        {isImage ? (
                          <Box
                            component="img"
                            src={doc}
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: 2,
                              objectFit: 'cover',
                              border: '1px solid',
                              borderColor: 'divider',
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: 2,
                              bgcolor: 'rgba(99, 102, 241, 0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <FileIcon sx={{ color: '#6366f1' }} />
                          </Box>
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            Document {idx + 1}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {isImage ? 'Image — Click to preview' : 'File — Click to open'}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="body2" color="text.disabled" fontStyle="italic">
                  No documents uploaded
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Review Notes */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 4,
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
                    bgcolor: 'rgba(139, 92, 246, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ReviewIcon sx={{ fontSize: 20, color: '#8b5cf6' }} />
                </Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Review Notes
                </Typography>
              </Box>

              {isTerminal ? (
                <Box>
                  {application.reviewNotes ? (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                        {application.reviewNotes}
                      </Typography>
                      {application.reviewedAt && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                          Reviewed on {formatDate(application.reviewedAt)}
                        </Typography>
                      )}
                    </Paper>
                  ) : (
                    <Typography variant="body2" color="text.disabled" fontStyle="italic">
                      No review notes provided
                    </Typography>
                  )}
                </Box>
              ) : (
                <TextField
                  fullWidth
                  multiline
                  minRows={4}
                  maxRows={8}
                  placeholder="Add review notes about this application..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                      bgcolor: 'background.paper',
                    },
                  }}
                />
              )}

              {application.status === 'rejected' && application.reviewNotes && (
                <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                  This application was rejected. Reason: {application.reviewNotes}
                </Alert>
              )}
              {application.status === 'approved' && (
                <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
                  This application has been approved. The applicant can proceed with the contract.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Approve Confirmation Dialog */}
      <Dialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ApproveIcon sx={{ color: '#10b981' }} />
            Approve Application
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Are you sure you want to approve <strong>{pd?.fullName || 'this applicant'}</strong>'s application
            for <strong>{appUnit?.unitIdentifier || 'the unit'}</strong>?
            The applicant will be notified and can proceed with the contract process.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            label="Approval Notes (optional)"
            placeholder="Any additional notes for the record..."
            value={approveNotes}
            onChange={(e) => setApproveNotes(e.target.value)}
            variant="outlined"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setApproveOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleApprove}
            disabled={!!actionLoading}
            sx={{
              bgcolor: '#10b981',
              '&:hover': { bgcolor: '#059669' },
              fontWeight: 700,
              borderRadius: 2,
              textTransform: 'none',
            }}
          >
            {actionLoading === 'approve' ? <CircularProgress size={20} color="inherit" /> : 'Confirm Approval'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <RejectIcon sx={{ color: '#ef4444' }} />
            Reject Application
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please provide a reason for rejecting <strong>{pd?.fullName || 'this applicant'}</strong>'s application.
            The applicant will see this reason.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            maxRows={6}
            label="Rejection Reason *"
            placeholder="Explain why this application is being rejected..."
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            required
            variant="outlined"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setRejectOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={!!actionLoading || !rejectNotes.trim()}
            sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
          >
            {actionLoading === 'reject' ? <CircularProgress size={20} color="inherit" /> : 'Confirm Rejection'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog
        open={!!viewingDoc}
        onClose={() => setViewingDoc(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Document Preview
          <Button onClick={() => setViewingDoc(null)} sx={{ textTransform: 'none' }}>Close</Button>
        </DialogTitle>
        <DialogContent>
          {viewingDoc && (
            <Box
              component="img"
              src={viewingDoc}
              alt="Document preview"
              sx={{
                width: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: 3,
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

/** Reusable info row */
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

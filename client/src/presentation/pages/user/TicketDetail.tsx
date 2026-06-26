import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Divider,
  TextField,
  Avatar,
  useTheme,
  alpha,
  CircularProgress,
  Grid,
  Alert,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Send as SendIcon,
  Schedule as ScheduleIcon,
  CheckCircle as ResolvedIcon,
  FiberManualRecord as DotIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { ticketService } from '../../../infrastructure/services/TicketService';
import { useAuth } from '../../../application/context/AuthContext';
import { useNotification } from '../../../application/context/NotificationContext';
import { getPriorityColor } from '../../utils/statusColors';
import type { Ticket } from '../../../domain/entities/Ticket';

export default function UserTicketDetail() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [followUp, setFollowUp] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (ticketId) loadTicket();
  }, [ticketId]);

  const loadTicket = async () => {
    setIsLoading(true);
    try {
      const data = await ticketService.getTicketById(ticketId!);
      setTicket(data);
    } catch {
      showNotification('Failed to load ticket details', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendFollowUp = async () => {
    if (!followUp.trim() || !ticketId) return;
    setIsSending(true);
    try {
      const updated = await ticketService.postUpdate(ticketId, { message: followUp.trim() });
      setTicket(updated);
      setFollowUp('');
      showNotification('Follow-up message sent', 'success');
    } catch {
      showNotification('Failed to send message', 'error');
    } finally {
      setIsSending(false);
    }
  };



  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <Alert severity="error">Ticket not found.</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/u/maintenance')}>Back to Tickets</Button>
      </Box>
    );
  }

  const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/u/maintenance')}
          sx={{ fontWeight: 600 }}
        >
          Back
        </Button>
        <PageHeader title={ticket.title} />
      </Box>

      <Grid container spacing={3}>
        {/* Left: Ticket Info */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card
            elevation={0}
            sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, mb: 3 }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                <StatusBadge status={ticket.status} />
                <Chip
                  label={ticket.priority}
                  size="small"
                  color={getPriorityColor(ticket.priority)}
                  sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                />
                <Chip
                  label={ticket.category}
                  size="small"
                  variant="outlined"
                  sx={{ textTransform: 'capitalize' }}
                />
              </Box>

              <Typography variant="body1" sx={{ mb: 3, whiteSpace: 'pre-wrap' }}>
                {ticket.description}
              </Typography>

              {/* Attached images */}
              {ticket.images && ticket.images.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Attached Photos
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {ticket.images.map((img, idx) => (
                      <Box
                        key={idx}
                        component="img"
                        src={img}
                        alt={`attachment-${idx}`}
                        sx={{
                          width: 100,
                          height: 100,
                          objectFit: 'cover',
                          borderRadius: 2,
                          border: `1px solid ${theme.palette.divider}`,
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">
                  Reported on {format(new Date(ticket.createdAt), 'MMMM dd, yyyy \'at\' h:mm a')}
                </Typography>
                {ticket.assignedToUser && (
                  <Typography variant="caption" color="text.secondary">
                    Assigned to <strong>{ticket.assignedToUser.name}</strong>
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Resolution notes */}
          {ticket.resolutionNotes && (
            <Alert
              severity="success"
              icon={<ResolvedIcon />}
              sx={{ borderRadius: 3, mb: 3, fontWeight: 500 }}
            >
              <Typography variant="subtitle2" fontWeight={700}>Resolution</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {ticket.resolutionNotes}
              </Typography>
              {ticket.resolvedAt && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Resolved on {format(new Date(ticket.resolvedAt), 'MMMM dd, yyyy')}
                </Typography>
              )}
            </Alert>
          )}
        </Grid>

        {/* Right: Timeline & Follow-up */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card
            elevation={0}
            sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, mb: 3 }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Progress Timeline
              </Typography>

              {/* Status timeline */}
              <Box sx={{ mb: 3 }}>
                {[
                  { key: 'open', label: 'Opened', date: ticket.createdAt },
                  ...(ticket.assignedToUserId
                    ? [{ key: 'assigned', label: `Assigned to ${ticket.assignedToUser?.name || 'Staff'}`, date: ticket.updatedAt }]
                    : []),
                  ...(ticket.updates.length > 0
                    ? [{ key: 'in_progress', label: 'In Progress', date: ticket.updates[0].timestamp }]
                    : []),
                  ...(ticket.resolvedAt
                    ? [{ key: 'resolved', label: 'Resolved', date: ticket.resolvedAt }]
                    : []),
                  ...(ticket.status === 'closed'
                    ? [{ key: 'closed', label: 'Closed', date: ticket.updatedAt }]
                    : []),
                ].map((step, idx, arr) => {
                  const isLast = idx === arr.length - 1;
                  return (
                    <Box key={step.key} sx={{ display: 'flex', gap: 2 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <DotIcon
                          sx={{
                            fontSize: 14,
                            color: isLast ? 'primary.main' : 'text.disabled',
                          }}
                        />
                        {!isLast && (
                          <Box
                            sx={{
                              width: 2,
                              flexGrow: 1,
                              bgcolor: 'divider',
                              my: 0.5,
                            }}
                          />
                        )}
                      </Box>
                      <Box sx={{ pb: isLast ? 0 : 2 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {step.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(step.date), 'MMM dd, h:mm a')}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Updates thread */}
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Updates
              </Typography>

              {ticket.updates.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  No progress updates yet. You will see updates here once the team starts working on your issue.
                </Typography>
              ) : (
                <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {ticket.updates.map((upd, idx) => {
                    const isOwn = upd.userId === user?.id;
                    return (
                      <Box
                        key={idx}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: isOwn
                            ? alpha(theme.palette.primary.main, 0.08)
                            : alpha(theme.palette.grey[500], 0.08),
                          border: `1px solid ${isOwn ? alpha(theme.palette.primary.main, 0.2) : theme.palette.divider}`,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: isOwn ? 'primary.main' : 'grey.500' }}>
                            {(upd.user?.name || (isOwn ? user?.name : 'Staff'))?.charAt(0)}
                          </Avatar>
                          <Typography variant="caption" fontWeight={600}>
                            {isOwn ? 'You' : (upd.user?.name || 'Staff')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                            {format(new Date(upd.timestamp), 'MMM dd, h:mm a')}
                          </Typography>
                        </Box>
                        <Typography variant="body2">{upd.message}</Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {/* Follow-up input */}
              {!isResolved && (
                <Box>
                  <TextField
                    placeholder="Add a follow-up message..."
                    fullWidth
                    multiline
                    rows={2}
                    value={followUp}
                    onChange={(e) => setFollowUp(e.target.value)}
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<SendIcon />}
                    onClick={handleSendFollowUp}
                    disabled={!followUp.trim() || isSending}
                    sx={{ fontWeight: 600, borderRadius: 2 }}
                  >
                    {isSending ? 'Sending...' : 'Send'}
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

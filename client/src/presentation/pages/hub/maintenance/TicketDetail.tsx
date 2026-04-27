import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Divider, Paper, Avatar, TextField,
  MenuItem, Grid, CircularProgress, Alert, Step,
  Stepper, StepLabel
} from '@mui/material';
import {
  ArrowBack, Send as SendIcon, CheckCircleOutline as ResolveIcon
} from '@mui/icons-material';
import { useTicketDetail } from '../../../../application/hooks/useTickets';
import StatusBadge from '../../../components/StatusBadge';
import type { TicketStatus } from '../../../../domain/entities/Ticket';

const STAFF_MEMBERS = [
  { id: 'usr_staff_1', name: 'Mario Plumber', role: 'Maintenance' },
  { id: 'usr_staff_2', name: 'Luigi Electrician', role: 'Electrical' },
  { id: 'usr_staff_3', name: 'Bob Builder', role: 'Structural' },
];

const STATUS_STEPS: TicketStatus[] = ['open', 'assigned', 'in_progress', 'resolved', 'closed'];

export default function TicketDetail() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { ticket, loading, error, fetchTicket, assign, postUpdate, resolve, close } = useTicketDetail(ticketId);

  const [staffId, setStaffId] = useState('');
  const [updateMessage, setUpdateMessage] = useState('');
  
  // Resolution state
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [estCost, setEstCost] = useState('');
  const [actCost, setActCost] = useState('');

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    if (ticket?.assignedToUserId) {
      setStaffId(ticket.assignedToUserId);
    }
  }, [ticket]);

  if (loading && !ticket) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  }

  if (error || !ticket) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/hub/maintenance')} sx={{ mb: 2 }}>Back</Button>
        <Alert severity="error">{error || 'Ticket not found.'}</Alert>
      </Box>
    );
  }

  const handleAssign = async () => {
    if (!staffId) return;
    try {
      await assign(staffId);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePostUpdate = async () => {
    if (!updateMessage.trim()) return;
    try {
      await postUpdate(updateMessage);
      setUpdateMessage('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolve = async () => {
    if (!resolutionNotes.trim()) return;
    try {
      await resolve(resolutionNotes, {
        estimated: estCost ? parseFloat(estCost) : undefined,
        actual: actCost ? parseFloat(actCost) : undefined
      });
      setIsResolving(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClose = async () => {
    try {
      await close();
    } catch (e) {
      console.error(e);
    }
  };

  const activeStep = STATUS_STEPS.indexOf(ticket.status);

  return (
    <Box sx={{ pb: 6 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/hub/maintenance')} sx={{ mb: 2 }}>
            Back to Tickets
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Typography variant="h4" fontWeight={800}>{ticket.title}</Typography>
            <StatusBadge status={ticket.status.replace('_', ' ').toUpperCase()} />
          </Box>
          <Typography color="text.secondary">
            Reported by {ticket.reportedByUser?.name} • {new Date(ticket.createdAt).toLocaleString()}
          </Typography>
        </Box>
        
        {ticket.status === 'resolved' && (
           <Button variant="contained" color="secondary" onClick={handleClose}>
             Close Ticket
           </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Left Column: Details & Thread */}
        <Grid size={{ xs: 12, md: 8 }}>
          
          {/* Status Timeline */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>Status Timeline</Typography>
            <Stepper activeStep={activeStep} alternativeLabel>
              {STATUS_STEPS.map((step) => (
                <Step key={step}>
                  <StepLabel sx={{ textTransform: 'capitalize' }}>{step.replace('_', ' ')}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Paper>

          {/* Ticket Description */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Issue Description</Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {ticket.description}
            </Typography>

            {ticket.images && ticket.images.length > 0 && (
              <Box sx={{ mt: 3, display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
                 {/* Placeholder for photos */}
                 {ticket.images.map((_, i) => (
                   <Box key={i} sx={{ width: 120, height: 120, borderRadius: 2, bgcolor: 'grey.200' }} />
                 ))}
              </Box>
            )}
          </Paper>

          {/* Resolution Info (if resolved) */}
          {ticket.status === 'resolved' && ticket.resolutionNotes && (
             <Paper sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
               <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                 <ResolveIcon color="success" />
                 <Typography variant="h6" fontWeight={700} color="success.main">Resolution</Typography>
               </Box>
               <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                 {ticket.resolutionNotes}
               </Typography>
             </Paper>
          )}

          {/* Progress Thread */}
          <Paper sx={{ p: 0, borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
              <Typography variant="h6" fontWeight={700}>Progress Updates</Typography>
            </Box>
            
            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {ticket.updates.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  No updates yet.
                </Typography>
              ) : (
                ticket.updates.map((update, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {update.userId === 'usr_tenant' ? 'T' : 'S'}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {update.userId === ticket.reportedByUserId ? 'Tenant' : 'Staff'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(update.timestamp).toLocaleString()}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                        <Typography variant="body2">{update.message}</Typography>
                      </Box>
                    </Box>
                  </Box>
                ))
              )}
            </Box>

            {/* Post Update Box */}
            {['assigned', 'in_progress'].includes(ticket.status) && (
              <Box sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                   <TextField 
                     fullWidth 
                     size="small" 
                     placeholder="Post a progress update..."
                     value={updateMessage}
                     onChange={(e) => setUpdateMessage(e.target.value)}
                     multiline
                     rows={2}
                   />
                   <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                     <Button 
                       variant="contained" 
                       endIcon={<SendIcon />} 
                       onClick={handlePostUpdate}
                       disabled={!updateMessage.trim() || loading}
                     >
                       Post
                     </Button>
                   </Box>
                </Box>
              </Box>
            )}
          </Paper>

        </Grid>

        {/* Right Column: Sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
           
          {/* Action Box: Assignment */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Assignment</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
              <TextField
                 select
                 fullWidth
                 size="small"
                 label="Assign to Staff"
                 value={staffId}
                 onChange={(e) => setStaffId(e.target.value)}
                 disabled={['resolved', 'closed'].includes(ticket.status)}
              >
                 <MenuItem value="">Unassigned</MenuItem>
                 {STAFF_MEMBERS.map(staff => (
                   <MenuItem key={staff.id} value={staff.id}>
                     {staff.name} ({staff.role})
                   </MenuItem>
                 ))}
              </TextField>
              
              {staffId !== ticket.assignedToUserId && staffId !== '' && (
                 <Button variant="outlined" onClick={handleAssign} disabled={loading} sx={{ mt: 1 }}>
                   Confirm Assignment
                 </Button>
              )}
            </Box>
          </Paper>

          {/* Action Box: Resolve */}
          {['assigned', 'in_progress'].includes(ticket.status) && (
             <Paper sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'success.light' }}>
               {isResolving ? (
                 <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                   <Typography variant="subtitle1" fontWeight={700} color="success.main">Resolve Ticket</Typography>
                   
                   <TextField
                     fullWidth
                     size="small"
                     label="Resolution Notes"
                     multiline
                     rows={3}
                     value={resolutionNotes}
                     onChange={(e) => setResolutionNotes(e.target.value)}
                     placeholder="What was done to fix the issue?"
                   />
                   
                   <Box sx={{ display: 'flex', gap: 2 }}>
                     <TextField
                       fullWidth
                       size="small"
                       label="Est. Cost"
                       type="number"
                       InputProps={{ startAdornment: <Typography color="text.secondary" sx={{ mr: 1 }}>₱</Typography> }}
                       value={estCost}
                       onChange={(e) => setEstCost(e.target.value)}
                     />
                     <TextField
                       fullWidth
                       size="small"
                       label="Actual Cost"
                       type="number"
                       InputProps={{ startAdornment: <Typography color="text.secondary" sx={{ mr: 1 }}>₱</Typography> }}
                       value={actCost}
                       onChange={(e) => setActCost(e.target.value)}
                     />
                   </Box>

                   <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                     <Button variant="contained" color="success" onClick={handleResolve} disabled={!resolutionNotes.trim() || loading} fullWidth>
                       Submit Resolution
                     </Button>
                     <Button variant="outlined" color="inherit" onClick={() => setIsResolving(false)}>
                       Cancel
                     </Button>
                   </Box>
                 </Box>
               ) : (
                 <Button 
                   variant="contained" 
                   color="success" 
                   fullWidth 
                   startIcon={<ResolveIcon />}
                   onClick={() => setIsResolving(true)}
                 >
                   Mark as Resolved
                 </Button>
               )}
             </Paper>
          )}

          {/* Details Box */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Ticket Info</Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Property</Typography>
                <Typography variant="body2" fontWeight={500}>{ticket.propertyId}</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">Unit</Typography>
                <Typography variant="body2" fontWeight={500}>{ticket.unitId}</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">Category</Typography>
                <Typography variant="body2" fontWeight={500} sx={{ textTransform: 'capitalize' }}>
                  {ticket.category.replace('_', ' ')}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">Priority</Typography>
                <Typography variant="body2" fontWeight={500} sx={{ textTransform: 'capitalize' }}>
                  {ticket.priority}
                </Typography>
              </Box>
            </Box>
          </Paper>

        </Grid>
      </Grid>
    </Box>
  );
}

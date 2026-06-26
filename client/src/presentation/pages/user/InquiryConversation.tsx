import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, CircularProgress, Button,
  TextField, Divider, IconButton, Chip, Tooltip,
} from '@mui/material';
import { ArrowBack, Send, Assignment } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../application/context/AuthContext';
import { useNotification } from '../../../application/context/NotificationContext';
import { useInquiryDetail } from '../../../application/hooks/useInquiries';
import { getStatusColor } from '../../utils/statusColors';
import ChatThread from '../../components/ChatThread';
import ApplicationFormDialog from '../../components/ApplicationFormDialog';
import type { ApplicationContext } from '../../components/ApplicationFormDialog';

export default function InquiryConversation() {
  const { inquiryId } = useParams<{ inquiryId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { inquiry, loading, error, fetchInquiry, sendMessage } = useInquiryDetail(inquiryId);
  const { showNotification } = useNotification();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  // Application dialog state
  const [appDialogOpen, setAppDialogOpen] = useState(false);
  const [appContext, setAppContext] = useState<ApplicationContext | null>(null);

  useEffect(() => {
    fetchInquiry();
  }, [fetchInquiry]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !user || !inquiryId) return;

    setSending(true);
    try {
      await sendMessage(user.id, user.name || 'User', draft);
      setDraft('');
      // In a real app we'd scroll to bottom
    } catch (err: any) {
      showNotification(err.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleApplyNow = () => {
    if (!inquiry) return;
    setAppContext({
      propertyId: inquiry.propertyId,
      propertyName: inquiry.propertyName,
      unitId: inquiry.unitId,
      unitIdentifier: inquiry.unitIdentifier,
    });
    setAppDialogOpen(true);
  };



  if (loading && !inquiry) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !inquiry) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error" variant="h6" gutterBottom>{error || 'Inquiry not found'}</Typography>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/u/inquiries')}>Back to Inquiries</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 3, px: 2, height: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/u/inquiries')} sx={{ bgcolor: 'action.hover' }}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            {inquiry.propertyName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Unit: {inquiry.unitIdentifier}
          </Typography>
        </Box>
        <Chip 
          label={inquiry.status} 
          color={getStatusColor(inquiry.status)}
          sx={{ textTransform: 'capitalize', fontWeight: 600 }}
        />
      </Box>

      {/* Chat Area */}
      <Card variant="outlined" sx={{ borderRadius: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ flexGrow: 1, overflowY: 'auto', bgcolor: 'background.default' }}>
          <ChatThread messages={inquiry.messages} currentUserId={user?.id || ''} />
        </Box>
        
        <Divider />
        
        {/* Reply Box + Apply Now */}
        <CardContent sx={{ p: 2, bgcolor: 'background.paper', '&:last-child': { pb: 2 } }}>
          <Box component="form" onSubmit={handleSend} sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Type your message..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              variant="outlined"
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              disabled={sending || inquiry.status === 'resolved'}
            />
            <Tooltip title="Apply for this unit" arrow placement="top">
              <Button
                variant="contained"
                color="success"
                onClick={handleApplyNow}
                disabled={inquiry.status === 'resolved'}
                sx={{
                  borderRadius: 3,
                  minWidth: 48,
                  width: 48,
                  height: 40,
                  mb: 0.5,
                  p: 0,
                  boxShadow: 2,
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'scale(1.08)',
                    boxShadow: 4,
                  },
                }}
              >
                <Assignment fontSize="small" />
              </Button>
            </Tooltip>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={!draft.trim() || sending || inquiry.status === 'resolved'}
              sx={{ borderRadius: 3, minWidth: 48, width: 48, height: 40, mb: 0.5, p: 0 }}
            >
              {sending ? <CircularProgress size={20} color="inherit" /> : <Send fontSize="small" />}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Application Form Dialog */}
      <ApplicationFormDialog
        open={appDialogOpen}
        onClose={() => setAppDialogOpen(false)}
        context={appContext}
        onSuccess={() => navigate('/u/applications')}
      />
    </Box>
  );
}

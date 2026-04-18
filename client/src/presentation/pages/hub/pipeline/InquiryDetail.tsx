import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, CircularProgress,
  TextField, IconButton, Divider, Chip, Avatar,
  Card, CardContent,
} from '@mui/material';
import {
  ArrowBack, Send as SendIcon,
  AttachFile as AttachIcon,
  Person as PersonIcon,
  Home as PropertyIcon,
  MeetingRoom as UnitIcon,
} from '@mui/icons-material';
import { useInquiryDetail } from '../../../../application/hooks/useInquiries';
import { useAuth } from '../../../../application/context/AuthContext';
import StatusBadge from '../../../components/StatusBadge';

/** Helper to format message timestamps */
function formatMessageTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  const time = d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

  if (isToday) return time;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;

  return `${d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} ${time}`;
}

/** Map status to display label */
function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pending',
    responded: 'Responded',
    resolved: 'Resolved',
    open: 'Open',
    in_progress: 'In Progress',
    closed: 'Closed',
    converted: 'Converted',
  };
  return map[status] || status;
}

/** Chat message bubble */
function MessageBubble({
  message,
  isOwn,
  senderName,
  senderAvatar,
}: {
  message: any;
  isOwn: boolean;
  senderName: string;
  senderAvatar?: string;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isOwn ? 'row-reverse' : 'row',
        gap: 1.5,
        mb: 2,
        maxWidth: '85%',
        alignSelf: isOwn ? 'flex-end' : 'flex-start',
      }}
    >
      {/* Avatar */}
      <Avatar
        src={senderAvatar}
        sx={{
          width: 36,
          height: 36,
          bgcolor: isOwn
            ? 'primary.main'
            : 'secondary.main',
          fontSize: '0.85rem',
          fontWeight: 700,
          flexShrink: 0,
          mt: 0.5,
        }}
      >
        {senderName.charAt(0).toUpperCase()}
      </Avatar>

      {/* Bubble */}
      <Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 0.5,
            flexDirection: isOwn ? 'row-reverse' : 'row',
          }}
        >
          <Typography variant="caption" fontWeight={600} color="text.primary">
            {isOwn ? 'You' : senderName}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            {formatMessageTime(message.timestamp || message.createdAt)}
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            px: 2,
            py: 1.5,
            borderRadius: isOwn ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
            bgcolor: isOwn
              ? 'primary.main'
              : (theme: any) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
            color: isOwn ? '#fff' : 'text.primary',
            maxWidth: 480,
          }}
        >
          <Typography variant="body2" sx={{ wordBreak: 'break-word', lineHeight: 1.6 }}>
            {message.content}
          </Typography>
          {message.attachments && message.attachments.length > 0 && (
            <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {message.attachments.map((att: string, i: number) => (
                <Chip
                  key={i}
                  label={`Attachment ${i + 1}`}
                  size="small"
                  variant="outlined"
                  component="a"
                  href={att}
                  target="_blank"
                  clickable
                  sx={{
                    borderColor: isOwn ? 'rgba(255,255,255,0.5)' : 'divider',
                    color: isOwn ? '#fff' : 'text.secondary',
                  }}
                />
              ))}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}

export default function InquiryDetail() {
  const { inquiryId } = useParams<{ inquiryId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    inquiry,
    loading,
    error,
    fetchInquiry,
    sendMessage,
  } = useInquiryDetail(inquiryId);

  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Messages are embedded in the inquiry
  const messages = (inquiry as any)?.messages || [];

  // Fetch inquiry on mount
  useEffect(() => {
    fetchInquiry();
  }, [fetchInquiry]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!replyText.trim() || !inquiry || sending) return;

    setSending(true);
    try {
      await sendMessage(user?.id || '', user?.name || 'Staff', replyText.trim());
      setReplyText('');
      // Refetch to get updated messages
      fetchInquiry();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Resolve sender info
  const getSenderInfo = (senderId: string): { name: string; avatar?: string } => {
    if (senderId === user?.id) {
      return { name: user.name, avatar: user.avatar };
    }
    // The inquiry user (tenant side)
    const inq = inquiry as any;
    if (inq?.userId === senderId) {
      return { name: inq.userName || 'Tenant', avatar: inq.userAvatar };
    }
    return { name: 'Participant' };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !inquiry) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/hub/pipeline/inquiries')} sx={{ mb: 2 }}>
          Back to Inquiries
        </Button>
        <Typography color="error">{error || 'Inquiry not found'}</Typography>
      </Box>
    );
  }

  const inq = inquiry as any;
  const isClosed = inq.status === 'resolved';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Back Navigation */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/hub/pipeline/inquiries')}
        sx={{ mb: 2, alignSelf: 'flex-start' }}
      >
        Back to Inquiries
      </Button>

      {/* Header Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 2,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)'
              : 'linear-gradient(135deg, rgba(102, 126, 234, 0.04) 0%, rgba(118, 75, 162, 0.04) 100%)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          {/* Left: Inquiry Info */}
          <Box sx={{ flex: 1, minWidth: 280 }}>
            <Typography variant="h5" fontWeight={800} gutterBottom>
              Inquiry about {inq.unitIdentifier || 'Unit'}
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 2 }}>
              {/* User Info */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar
                  src={inq.userAvatar}
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: 'primary.main',
                    fontSize: '0.8rem',
                  }}
                >
                  {(inq.userName || 'U').charAt(0) || <PersonIcon fontSize="small" />}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {inq.userName || 'Unknown'}
                  </Typography>
                </Box>
              </Box>

              {/* Property */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PropertyIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {inq.propertyName || 'Unknown Property'}
                </Typography>
              </Box>

              {/* Unit */}
              {inq.unitIdentifier && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <UnitIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {inq.unitIdentifier}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Right: Status */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1.5 }}>
            <StatusBadge status={getStatusLabel(inq.status)} />
          </Box>
        </Box>
      </Paper>

      {/* Conversation Thread */}
      <Card
        variant="outlined"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 3,
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* Thread Header */}
        <Box
          sx={{
            px: 3,
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
            Conversation Thread
          </Typography>
        </Box>

        {/* Messages */}
        <CardContent
          sx={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            py: 3,
            px: 3,
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-thumb': {
              borderRadius: 3,
              bgcolor: 'divider',
            },
          }}
        >
          {messages.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No messages yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start the conversation by sending a reply below.
              </Typography>
            </Box>
          ) : (
            messages.map((msg: any) => {
              const senderId = msg.senderId?._id || msg.senderId;
              const isOwn = senderId === user?.id;
              const senderInfo = getSenderInfo(senderId);

              return (
                <MessageBubble
                  key={msg._id || msg.id}
                  message={msg}
                  isOwn={isOwn}
                  senderName={msg.senderName || senderInfo.name}
                  senderAvatar={senderInfo.avatar}
                />
              );
            })
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Reply Input */}
        <Divider />
        <Box
          sx={{
            p: 2,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
          }}
        >
          {isClosed ? (
            <Box sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="body2" color="text.secondary">
                This inquiry has been resolved. Reopen it to continue the conversation.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
              <IconButton
                size="small"
                sx={{ color: 'text.secondary', mb: 0.5 }}
                title="Attach file"
              >
                <AttachIcon />
              </IconButton>

              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder="Type your reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={handleKeyPress}
                variant="outlined"
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    bgcolor: 'background.paper',
                  },
                }}
              />

              <IconButton
                onClick={handleSendMessage}
                disabled={!replyText.trim() || sending}
                sx={{
                  mb: 0.5,
                  bgcolor: 'primary.main',
                  color: '#fff',
                  width: 40,
                  height: 40,
                  '&:hover': { bgcolor: 'primary.dark' },
                  '&.Mui-disabled': {
                    bgcolor: 'action.disabledBackground',
                    color: 'action.disabled',
                  },
                }}
              >
                {sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon fontSize="small" />}
              </IconButton>
            </Box>
          )}
        </Box>
      </Card>
    </Box>
  );
}

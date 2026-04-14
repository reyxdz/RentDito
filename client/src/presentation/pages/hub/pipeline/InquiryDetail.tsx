import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, CircularProgress,
  TextField, IconButton, Divider, Chip, Avatar,
  MenuItem, Select, type SelectChangeEvent,
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
import type { InquiryStatus } from '../../../../domain/entities/Inquiry';
import type { Message } from '../../../../domain/entities/Message';

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
function getStatusLabel(status: InquiryStatus): string {
  const map: Record<InquiryStatus, string> = {
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
  message: Message;
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
            {formatMessageTime(message.createdAt)}
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
              : (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
            color: isOwn ? '#fff' : 'text.primary',
            maxWidth: 480,
          }}
        >
          <Typography variant="body2" sx={{ wordBreak: 'break-word', lineHeight: 1.6 }}>
            {message.content}
          </Typography>
          {message.attachments && message.attachments.length > 0 && (
            <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {message.attachments.map((att, i) => (
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
    messages,
    loading,
    messagesLoading,
    error,
    fetchInquiry,
    fetchMessages,
    sendMessage,
    updateStatus,
  } = useInquiryDetail(inquiryId);

  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch inquiry on mount
  useEffect(() => {
    fetchInquiry();
  }, [fetchInquiry]);

  // Fetch messages when inquiry loads and has conversationId
  useEffect(() => {
    if (inquiry?.conversationId) {
      fetchMessages(inquiry.conversationId as string);
    }
  }, [inquiry?.conversationId, fetchMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!replyText.trim() || !inquiry?.conversationId || sending) return;

    setSending(true);
    try {
      await sendMessage(inquiry.conversationId as string, replyText.trim());
      setReplyText('');
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

  const handleStatusChange = async (e: SelectChangeEvent<string>) => {
    const newStatus = e.target.value as InquiryStatus;
    setStatusUpdating(true);
    try {
      await updateStatus(newStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setStatusUpdating(false);
    }
  };

  // Resolve sender info from participants
  const getSenderInfo = (senderId: string): { name: string; avatar?: string } => {
    if (senderId === user?.id) {
      return { name: user.name, avatar: user.avatar };
    }
    // The inquiry user (tenant side)
    const inquiryUser = inquiry?.user as any;
    if (inquiryUser && ((inquiryUser._id || inquiryUser.id) === senderId)) {
      return { name: inquiryUser.name, avatar: inquiryUser.avatar };
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

  const inquiryUser = inquiry.user as any;
  const inquiryProperty = inquiry.property as any;
  const inquiryUnit = inquiry.unit as any;
  const isClosed = inquiry.status === 'closed' || inquiry.status === 'converted';

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
              {inquiry.subject}
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 2 }}>
              {/* User Info */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar
                  src={inquiryUser?.avatar}
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: 'primary.main',
                    fontSize: '0.8rem',
                  }}
                >
                  {inquiryUser?.name?.charAt(0) || <PersonIcon fontSize="small" />}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {inquiryUser?.name || 'Unknown'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {inquiryUser?.email || ''}
                  </Typography>
                </Box>
              </Box>

              {/* Property */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PropertyIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {inquiryProperty?.name || 'Unknown Property'}
                </Typography>
              </Box>

              {/* Unit */}
              {inquiryUnit && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <UnitIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {inquiryUnit?.unitIdentifier || '—'}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Right: Status & Actions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1.5 }}>
            <StatusBadge status={getStatusLabel(inquiry.status)} />

            <Select
              value={inquiry.status}
              onChange={handleStatusChange}
              size="small"
              disabled={statusUpdating}
              sx={{
                minWidth: 160,
                '& .MuiSelect-select': { py: 1 },
              }}
            >
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="closed">Close</MenuItem>
              <MenuItem value="converted">Convert to Visit</MenuItem>
            </Select>
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
          {messagesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : messages.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No messages yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start the conversation by sending a reply below.
              </Typography>
            </Box>
          ) : (
            messages.map((msg) => {
              const senderId = (msg as any).senderId?._id || (msg as any).senderId;
              const isOwn = senderId === user?.id;
              const senderInfo = getSenderInfo(senderId);

              return (
                <MessageBubble
                  key={(msg as any)._id || msg.id}
                  message={msg}
                  isOwn={isOwn}
                  senderName={senderInfo.name}
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
                This inquiry has been {inquiry.status === 'closed' ? 'closed' : 'converted'}. Reopen it to continue the conversation.
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

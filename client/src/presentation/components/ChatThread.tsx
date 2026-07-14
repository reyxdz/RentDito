import { Box, Typography, Avatar, Paper } from '@mui/material';
import { format } from 'date-fns';
import type { Message } from '../../domain/entities/Message';

export interface ChatThreadProps {
  messages: Message[];
  currentUserId: string;
}

export default function ChatThread({ messages, currentUserId }: ChatThreadProps) {
  if (!messages || messages.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="body1">No messages yet. Start the conversation!</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 2 }}>
      {messages.map((msg) => {
        const isMe = msg.senderId === currentUserId;

        return (
          <Box
            key={msg.id}
            sx={{
              display: 'flex',
              flexDirection: isMe ? 'row-reverse' : 'row',
              alignItems: 'flex-start',
              gap: 2
            }}
          >
            <Avatar
              src={msg.senderAvatar}
              sx={{
                width: 40,
                height: 40,
                bgcolor: isMe ? 'primary.main' : 'secondary.main'
              }}
            >
              {msg.senderName?.charAt(0) ?? msg.senderId.charAt(0)}
            </Avatar>

            <Box sx={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {isMe ? 'You' : msg.senderName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {format(new Date(msg.timestamp ?? msg.createdAt), 'MMM d, h:mm a')}
                </Typography>
              </Box>

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: isMe ? 'primary.main' : 'background.default',
                  color: isMe ? 'primary.contrastText' : 'text.primary',
                  borderRadius: 3,
                  borderTopRightRadius: isMe ? 4 : 24,
                  borderTopLeftRadius: !isMe ? 4 : 24,
                  border: isMe ? 'none' : '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {msg.content}
                </Typography>
              </Paper>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, TextField, Button, Avatar, Paper, CircularProgress, Divider, List, ListItem, ListItemAvatar
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { useTenantDetail } from '../../application/hooks/useTenants';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../application/context/AuthContext';

interface PostCheckInCommentsProps {
  tenancyId: string;
}

export default function PostCheckInComments({ tenancyId }: PostCheckInCommentsProps) {
  const { getComments, addComment } = useTenantDetail(tenancyId);
  const { user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState('');
  const endOfListRef = useRef<HTMLDivElement>(null);

  const fetchComments = async () => {
    try {
      const data = await getComments();
      setComments(data);
    } catch (error) {
      console.error('Failed to fetch comments', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [tenancyId]);

  useEffect(() => {
    if (endOfListRef.current) {
      endOfListRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setSubmitting(true);
    try {
      await addComment(text);
      setText('');
      await fetchComments();
    } catch (error) {
      console.error('Failed to add comment', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 4, display: 'flex', flexDirection: 'column', height: 400 }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'grey.50', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
        <Typography variant="h6" fontWeight={700}>Post-Check-In Observations</Typography>
        <Typography variant="body2" color="text.secondary">Use this space to report issues or communicate with your landlord.</Typography>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
        {comments.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <Typography color="text.secondary" fontStyle="italic">No comments yet. Start the conversation!</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {comments.map((comment, index) => {
              const isMine = comment.userId?._id === user?.id;
              
              return (
                <ListItem 
                  key={index} 
                  alignItems="flex-start" 
                  sx={{ 
                    flexDirection: isMine ? 'row-reverse' : 'row',
                    mb: 2,
                    px: 0
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 0, mx: 1.5 }}>
                    <Avatar src={comment.userId?.avatar} alt={comment.userId?.name} />
                  </ListItemAvatar>
                  <Box sx={{ 
                    maxWidth: '75%', 
                    bgcolor: isMine ? 'primary.main' : 'grey.100', 
                    color: isMine ? 'primary.contrastText' : 'text.primary',
                    p: 1.5, 
                    borderRadius: 2,
                    borderTopRightRadius: isMine ? 0 : 8,
                    borderTopLeftRadius: isMine ? 8 : 0
                  }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 0.5, opacity: 0.8, fontWeight: 600 }}>
                      {comment.userId?.name} • {comment.role} • {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {comment.text}
                    </Typography>
                  </Box>
                </ListItem>
              );
            })}
            <div ref={endOfListRef} />
          </List>
        )}
      </Box>

      <Divider />

      <Box component="form" onSubmit={handleSubmit} sx={{ p: 2, display: 'flex', gap: 1, bgcolor: 'background.paper', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={submitting}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4 } }}
        />
        <Button 
          type="submit" 
          variant="contained" 
          disabled={!text.trim() || submitting}
          sx={{ borderRadius: 4, minWidth: 'auto', px: 3 }}
        >
          {submitting ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
        </Button>
      </Box>
    </Paper>
  );
}

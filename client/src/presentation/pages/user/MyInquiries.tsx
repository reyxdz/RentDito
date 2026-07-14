import { useEffect } from 'react';
import { Box, Typography, Card, CardContent, Chip, CircularProgress, Button } from '@mui/material';
import { ChatBubbleOutline, ChevronRight, HomeWork } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../application/context/AuthContext';
import { useInquiries } from '../../../application/hooks/useInquiries';
import { getStatusColor } from '../../utils/statusColors';
import { format } from 'date-fns';

export default function MyInquiries() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { inquiries, loading, error, fetchInquiries } = useInquiries(user?.id);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);



  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 4, px: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <ChatBubbleOutline color="primary" sx={{ fontSize: 32 }} />
        <Typography variant="h4" sx={{ fontWeight: 800 }}>My Inquiries</Typography>
      </Box>

      {loading && !inquiries.length ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : inquiries.length === 0 ? (
        <Card variant="outlined" sx={{ borderRadius: 3, borderStyle: 'dashed', borderWidth: 2, bgcolor: 'transparent' }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
            <ChatBubbleOutline sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={600} gutterBottom>
              No Inquiries Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
              You haven't made any inquiries yet. Browse our listings to find your match!
            </Typography>
            <Button variant="contained" onClick={() => navigate('/listings')} sx={{ mt: 3 }}>
              Browse Listings
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {inquiries.map((inquiry) => (
            <Card 
              key={inquiry.id} 
              variant="outlined" 
              sx={{ 
                borderRadius: 3, 
                transition: 'all 0.2s',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'primary.main',
                  transform: 'translateY(-2px)',
                  boxShadow: 2
                }
              }}
              onClick={() => navigate(`/u/inquiries/${inquiry.id}`)}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3, '&:last-child': { pb: 3 } }}>
                <Box sx={{ 
                  width: 56, height: 56, borderRadius: 2, bgcolor: 'primary.50', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 3 
                }}>
                  <HomeWork color="primary" />
                </Box>
                
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {inquiry.property?.name || 'Property'}
                    </Typography>
                    <Chip 
                      label={inquiry.status} 
                      size="small" 
                      color={getStatusColor(inquiry.status)}
                      sx={{ textTransform: 'capitalize', fontWeight: 600, height: 20 }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Unit: {inquiry.unit?.unitIdentifier || '—'}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {format(new Date(inquiry.updatedAt), 'MMM d, yyyy')}
                  </Typography>
                  <ChevronRight color="action" />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}

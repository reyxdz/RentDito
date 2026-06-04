import { useState } from 'react';
import { Box, Typography, Card, CardContent, Button, Chip, Avatar } from '@mui/material';
import { CheckCircle, Cancel, ImageSearch } from '@mui/icons-material';

// Mock data for pending user verifications
const MOCK_PENDING_USERS = [
  { id: 'usr_1',  name: 'Juan Dela Cruz', email: 'juan@example.com', submittedAt: '2026-04-14T09:00:00Z', type: 'Landlord' },
  { id: 'usr_2',  name: 'Maria Santos', email: 'maria@example.com', submittedAt: '2026-04-13T14:30:00Z', type: 'Tenant' },
  { id: 'usr_3',  name: 'Pedro Penduko', email: 'pedro@example.com', submittedAt: '2026-04-12T10:15:00Z', type: 'Tenant' },
];

export default function UserVerifications() {
  const [pendingUsers, setPendingUsers] = useState(MOCK_PENDING_USERS);

  const handleAction = (userId: string, action: 'approve' | 'reject') => {
    // Visually remove the user from the pending queue
    setPendingUsers(prev => prev.filter(u => u.id !== userId));
    // Simulation: API call to update verification status would happen here
    // TODO: Call verification API — e.g. verificationService.updateStatus(userId, action)
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            User Verifications
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Review and approve user submitted government IDs.
          </Typography>
        </Box>
        <Chip label={`${pendingUsers.length} Pending Actions`} color={pendingUsers.length > 0 ? "warning" : "default"} sx={{ fontWeight: 'bold' }} />
      </Box>

      {pendingUsers.length === 0 ? (
        <Card variant="outlined" sx={{ bgcolor: 'transparent', borderStyle: 'dashed', borderWidth: 2 }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
            <CheckCircle color="success" sx={{ fontSize: 64, mb: 2, opacity: 0.8 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={600}>All caught up!</Typography>
            <Typography variant="body2" color="text.secondary">There are no pending verifications requiring your attention.</Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {pendingUsers.map((user) => (
            <Card key={user.id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3, p: 3 }}>
                <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.light' }}>{user.name.charAt(0)}</Avatar>
                
                <Box sx={{ flexGrow: 1, minWidth: 200 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="h6" fontWeight={700}>{user.name}</Typography>
                    <Chip label={user.type} size="small" variant="outlined" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Submitted: {new Date(user.submittedAt).toLocaleString()}
                  </Typography>
                </Box>

                <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
                  <Button startIcon={<ImageSearch />} variant="outlined" color="info" size="small" sx={{ borderRadius: 8 }}>
                    View ID Documents (2)
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button 
                    startIcon={<CheckCircle />} 
                    variant="contained" 
                    color="success" 
                    disableElevation
                    onClick={() => handleAction(user.id, 'approve')}
                  >
                    Approve
                  </Button>
                  <Button 
                    startIcon={<Cancel />} 
                    variant="outlined" 
                    color="error"
                    onClick={() => handleAction(user.id, 'reject')}
                  >
                    Reject
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}

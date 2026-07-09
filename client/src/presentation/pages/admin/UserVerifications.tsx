import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, Chip, Avatar, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, TextField } from '@mui/material';
import { CheckCircle, Cancel, ImageSearch, Close } from '@mui/icons-material';
import AdminService from '../../../infrastructure/services/AdminService';
import { useNotification } from '../../../application/context/NotificationContext';
import { getImageUrl } from '../../../infrastructure/api/apiClient';

interface PendingUser {
  _id: string;
  name: string;
  email: string;
  updatedAt: string;
  role: string;
  idPhotos?: string[];
}

export default function UserVerifications() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const { showNotification } = useNotification();

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const res = await AdminService.getPendingVerifications();
      setPendingUsers(res.data || []);
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Failed to fetch verifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  const handleApprove = async (userId: string) => {
    try {
      await AdminService.approveVerification(userId);
      showNotification('Verification approved', 'success');
      fetchVerifications();
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Failed to approve verification', 'error');
    }
  };

  const handleRejectClick = (user: PendingUser) => {
    setSelectedUser(user);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedUser) return;
    try {
      await AdminService.rejectVerification(selectedUser._id, rejectReason);
      showNotification('Verification rejected', 'info');
      setRejectDialogOpen(false);
      fetchVerifications();
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Failed to reject verification', 'error');
    }
  };

  const openViewer = (user: PendingUser) => {
    setSelectedUser(user);
    setViewerOpen(true);
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
            <Card key={user._id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3, p: 3 }}>
                <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.light' }}>{user.name.charAt(0)}</Avatar>
                
                <Box sx={{ flexGrow: 1, minWidth: 200 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="h6" fontWeight={700}>{user.name}</Typography>
                    <Chip label={user.role} size="small" variant="outlined" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Submitted: {new Date(user.updatedAt).toLocaleString()}
                  </Typography>
                </Box>

                <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
                  <Button 
                    startIcon={<ImageSearch />} 
                    variant="outlined" 
                    color="info" 
                    size="small" 
                    sx={{ borderRadius: 8 }}
                    onClick={() => openViewer(user)}
                    disabled={!user.idPhotos || user.idPhotos.length === 0}
                  >
                    View ID Documents ({user.idPhotos?.length || 0})
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button 
                    startIcon={<CheckCircle />} 
                    variant="contained" 
                    color="success" 
                    disableElevation
                    onClick={() => handleApprove(user._id)}
                  >
                    Approve
                  </Button>
                  <Button 
                    startIcon={<Cancel />} 
                    variant="outlined" 
                    color="error"
                    onClick={() => handleRejectClick(user)}
                  >
                    Reject
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Verification</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Are you sure you want to reject the verification for {selectedUser?.name}?
          </Typography>
          <TextField
            fullWidth
            label="Reason for Rejection"
            multiline
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleConfirmReject} color="error" variant="contained" disableElevation>Reject</Button>
        </DialogActions>
      </Dialog>

      {/* ID Viewer Dialog */}
      <Dialog open={viewerOpen} onClose={() => setViewerOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">ID Documents - {selectedUser?.name}</Typography>
          <IconButton onClick={() => setViewerOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: 'grey.100', display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center', py: 4 }}>
          {selectedUser?.idPhotos?.map((photo, index) => (
            <Card key={index} sx={{ width: '100%', maxWidth: 600, borderRadius: 2, overflow: 'hidden', boxShadow: 3 }}>
              <Box component="img" src={getImageUrl(photo)} alt={`ID Photo ${index + 1}`} sx={{ width: '100%', height: 'auto', display: 'block' }} />
            </Card>
          ))}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

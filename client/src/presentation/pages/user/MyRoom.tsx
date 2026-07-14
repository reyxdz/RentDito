import { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, Paper, Divider, Avatar, Chip, CircularProgress, Button
} from '@mui/material';
import {
  Home as HomeIcon,
  People as PeopleIcon,
  EventNote as EventNoteIcon,
  Person as PersonIcon,
  Assignment as ContractIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../application/context/AuthContext';
import { useTenantDetail } from '../../../application/hooks/useTenants';
import PostCheckInComments from '../../components/PostCheckInComments';
import StatusBadge from '../../components/StatusBadge';

export default function MyRoom() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const activeTenancy = user?.activeTenancy;
  const { getRoommates, tenancy, fetchTenancy, loading } = useTenantDetail(activeTenancy?.id);
  const [roommates, setRoommates] = useState<any[]>([]);
  const [roommatesLoading, setRoommatesLoading] = useState(false);

  useEffect(() => {
    if (activeTenancy) {
      fetchTenancy();
      fetchRoommates();
    }
  }, [activeTenancy]);

  const fetchRoommates = async () => {
    setRoommatesLoading(true);
    try {
      const data = await getRoommates();
      setRoommates(data);
    } catch (error) {
      console.error('Failed to fetch roommates', error);
    } finally {
      setRoommatesLoading(false);
    }
  };

  if (!activeTenancy) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="text.secondary">You do not have an active tenancy.</Typography>
        <Button variant="contained" onClick={() => navigate('/listings')} sx={{ mt: 2 }}>Browse Listings</Button>
      </Box>
    );
  }

  if (loading || !tenancy) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  const { property, unit, contract } = tenancy;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>My Unit</Typography>
      
      <Grid container spacing={4}>
        {/* Left Column: Details */}
        <Grid size={{ xs: 12, md: 7, lg: 8 }}>
          
          {/* Unit Info Card */}
          <Paper variant="outlined" sx={{ borderRadius: 4, mb: 4, overflow: 'hidden' }}>
            <Box sx={{ p: 3, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', gap: 2 }}>
              <HomeIcon sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h5" fontWeight={700}>{property?.name || 'Unknown Property'}</Typography>
                <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                  Unit {unit?.unitIdentifier} {tenancy.slotNumber ? `• Slot ${tenancy.slotNumber}` : ''}
                </Typography>
              </Box>
              <Box sx={{ ml: 'auto' }}>
                <StatusBadge status={tenancy.status} />
              </Box>
            </Box>
            
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <EventNoteIcon color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Check-In Date</Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {tenancy.checkInDate ? new Date(tenancy.checkInDate).toLocaleDateString() : 'Pending'}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <ContractIcon color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Contract End</Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {contract?.endDate ? new Date(contract.endDate).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid size={{ xs: 12, sm: 6 }}>
                  {contract && (
                    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>MONTHLY RENT</Typography>
                      <Typography variant="h5" color="primary.main" fontWeight={800}>
                        ₱{contract.monthlyRent?.toLocaleString()}
                      </Typography>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        fullWidth 
                        sx={{ mt: 1, borderRadius: 2 }}
                        onClick={() => navigate(`/u/contracts/${contract.id}`)}
                      >
                        View Contract
                      </Button>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </Box>
          </Paper>

          {/* Comments Section */}
          <PostCheckInComments tenancyId={tenancy.id} />

        </Grid>

        {/* Right Column: Roommates / Occupants */}
        <Grid size={{ xs: 12, md: 5, lg: 4 }}>
          <Paper variant="outlined" sx={{ borderRadius: 4, p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <PeopleIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                {unit?.accommodationType === 'bedspace' ? 'Roommates' : 'Occupants'}
              </Typography>
            </Box>
            
            <Divider sx={{ mb: 3 }} />

            {/* Current User */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar src={user?.avatar} sx={{ width: 48, height: 48, bgcolor: 'primary.light' }}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>{user?.name} (You)</Typography>
                <Chip size="small" label={tenancy.slotNumber ? `Slot ${tenancy.slotNumber}` : (tenancy.isPrimary ? 'Primary' : 'Resident')} color="primary" variant="outlined" />
              </Box>
            </Box>

            {/* Other Roommates */}
            {roommatesLoading ? (
              <Box display="flex" justifyContent="center" p={2}><CircularProgress size={24} /></Box>
            ) : roommates.length > 0 ? (
              roommates.map((rm) => (
                <Box key={rm._id} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar src={rm.userId?.avatar} sx={{ width: 40, height: 40 }}>
                    <PersonIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="body1" fontWeight={600}>{rm.userId?.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {rm.slotNumber ? `Slot ${rm.slotNumber}` : 'Resident'}
                    </Typography>
                  </Box>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', p: 2 }}>
                {unit?.accommodationType === 'bedspace' ? 'No other roommates currently.' : 'No other registered occupants.'}
              </Typography>
            )}

            {/* Household Members (if whole-room) */}
            {unit?.accommodationType !== 'bedspace' && tenancy.householdMembers && tenancy.householdMembers.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Registered Household Members</Typography>
                {tenancy.householdMembers.map((member: any, i: number) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'grey.300' }}><PersonIcon fontSize="small" /></Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{member.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{member.relation}</Typography>
                    </Box>
                  </Box>
                ))}
              </>
            )}

          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

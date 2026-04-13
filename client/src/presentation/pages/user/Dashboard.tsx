
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  useTheme,
  alpha,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Message as MessageIcon,
  Visibility as VisibilityIcon,
  Assignment as AssignmentIcon,
  Home as HomeIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../application/context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();

  // Mock stats
  const stats = {
    inquiries: 0,
    visits: 0,
    applications: 0,
  };

  const hasTenancy = !!user?.activeTenancy;

  const statCards = [
    { label: 'My Inquiries', value: stats.inquiries, icon: <MessageIcon />, color: theme.palette.info.main },
    { label: 'My Visits', value: stats.visits, icon: <VisibilityIcon />, color: theme.palette.secondary.main },
    { label: 'My Applications', value: stats.applications, icon: <AssignmentIcon />, color: theme.palette.success.main },
  ];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
      {/* Welcome Banner */}
      <Box
        sx={{
          mb: 4,
          p: 4,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: theme.shadows[4],
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Welcome back, {user?.name?.split(' ')[0] || 'User'}!
          </Typography>
          <Typography variant="subtitle1" sx={{ opacity: 0.9, mb: 3 }}>
            Ready to find your next home or manage your current tenancy?
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            startIcon={<SearchIcon />}
            onClick={() => navigate('/listings')}
            sx={{
              fontWeight: 700,
              px: 4,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: theme.shadows[6],
            }}
          >
            Browse Listings
          </Button>
        </Box>
        {/* Decorative elements */}
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            zIndex: 0,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -30,
            right: 100,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.05)',
            zIndex: 0,
          }}
        />
      </Box>

      {/* Quick Stats Grid */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        Quick Overview
      </Typography>
      <Grid container spacing={3} sx={{ mb: 5 }}>
        {statCards.map((stat, idx) => (
          <Grid size={{ xs: 12, sm: 4 }} key={idx}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                border: `1px solid ${theme.palette.divider}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: theme.shadows[4],
                  borderColor: 'transparent',
                },
              }}
            >
              <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 56,
                    height: 56,
                    borderRadius: 2,
                    bgcolor: alpha(stat.color, 0.1),
                    color: stat.color,
                  }}
                >
                  {stat.icon}
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={600} gutterBottom>
                    {stat.label}
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="text.primary">
                    {stat.value}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Active Tenancy Section */}
      {hasTenancy && (
        <>
          <Divider sx={{ mb: 4 }} />
          <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
            My Tenancy
          </Typography>
          <Grid container spacing={3}>
            {/* My Room summary card */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: `1px solid ${theme.palette.divider}`,
                  height: '100%',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <HomeIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      My Room
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    You are currently a resident at <strong>Sunrise Apartments, Unit 3B</strong>.
                  </Typography>
                  {/* You could add more mock details here */}
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button size="small" onClick={() => navigate('/u/my-unit')} sx={{ fontWeight: 600 }}>
                    View Contract Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            {/* Current Bill summary card */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: `1px solid ${theme.palette.divider}`,
                  height: '100%',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <ReceiptIcon color="error" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Current Bill
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Upcoming invoice for <strong>November 2026</strong>.
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="error.main" sx={{ mb: 2 }}>
                    $850.00
                  </Typography>
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button size="small" variant="contained" onClick={() => navigate('/u/bills')} sx={{ fontWeight: 600, px: 3 }}>
                    Pay Now
                  </Button>
                  <Button size="small" onClick={() => navigate('/u/bills')} sx={{ fontWeight: 600 }}>
                    View Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}

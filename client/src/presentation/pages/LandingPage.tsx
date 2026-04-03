import { Box, Typography, Button, Container, Card, Grid, AppBar, Toolbar, Chip, IconButton } from '@mui/material';
import { Home, Search, AutoAwesome, Brightness4, Brightness7 } from '@mui/icons-material';
import { useColorMode } from '../context/ThemeContext';
import { useAuth } from '../../application/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import logoPng from '../../assets/logo.png';

export default function LandingPage() {
  const { mode, toggleColorMode } = useColorMode();
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" sx={{ pt: 1, pb: 1 }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Logo Placeholder that represents the custom colored icon */}
              <Box 
                component="img"
                src={logoPng}
                alt="RentDito Logo"
                sx={{ 
                  height: 40,
                  objectFit: 'contain'
                }}
              />
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', ml: 1, letterSpacing: -0.5 }}>
                RentDito
              </Typography>
            </Box>
            
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 3, alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 500, cursor: 'pointer', '&:hover': { color: 'primary.main' } }}>Properties</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, cursor: 'pointer', '&:hover': { color: 'primary.main' } }}>Landlords</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, cursor: 'pointer', '&:hover': { color: 'primary.main' } }}>About</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <IconButton onClick={toggleColorMode} sx={{ color: 'text.secondary' }}>
                {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
              
              {!isAuthenticated ? (
                <Button variant="contained" color="primary" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
              ) : (
                <>
                  <Button variant="outlined" color="primary" onClick={() => {
                    if (user?.role === 'admin') navigate('/admin');
                    else if (user?.role === 'landlord') navigate('/landlord');
                    else navigate('/tenant');
                  }}>
                    Dashboard
                  </Button>
                  <Button variant="text" color="error" onClick={() => logout()}>
                    Sign Out
                  </Button>
                </>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Box sx={{ flexGrow: 1, py: { xs: 8, md: 12 }, position: 'relative', overflow: 'hidden' }}>
        {/* Decorative background blobs for a modern feel */}
        <Box sx={{
          position: 'absolute', top: '-10%', right: '-5%', width: '40%', height: '50%',
          background: 'radial-gradient(circle, rgba(90,49,232,0.08) 0%, rgba(90,49,232,0) 70%)', zIndex: 0
        }} />
        <Box sx={{
          position: 'absolute', bottom: '-10%', left: '-10%', width: '50%', height: '50%',
          background: 'radial-gradient(circle, rgba(43,208,248,0.08) 0%, rgba(43,208,248,0) 70%)', zIndex: 0
        }} />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={6} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Chip 
                icon={<AutoAwesome sx={{ fontSize: 16 }} />} 
                label="The modern way to rent" 
                color="secondary" 
                variant="outlined"
                sx={{ mb: 3, fontWeight: 600, px: 1, borderColor: 'secondary.main', color: 'secondary.dark' }} 
              />
              <Typography variant="h1" sx={{ mb: 2, fontSize: { xs: '3rem', md: '4.5rem' }, lineHeight: 1.1 }}>
                Find Your Next <Box component="span" sx={{ color: 'primary.main' }}>Perfect</Box> Home
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 4, fontWeight: 400, maxWidth: '90%', lineHeight: 1.6 }}>
                Discover premium rentals with a seamless, beautifully designed platform built for the modern tenant and landlord.
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="contained" color="primary" size="large" startIcon={<Search />} sx={{ px: 4, py: 1.5, fontSize: '1.1rem' }}>
                  Start Browsing
                </Button>
                <Button variant="outlined" color="primary" size="large" sx={{ px: 4, py: 1.5, fontSize: '1.1rem', backgroundColor: 'white' }}>
                  How it works
                </Button>
              </Box>
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ position: 'relative' }}>
                 <Card sx={{ 
                    position: 'absolute', top: -30, right: -20, zIndex: 2,
                    p: 2, display: 'flex', alignItems: 'center', gap: 2,
                    animation: 'float 3s ease-in-out infinite'
                  }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: 'success.light', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'success.main' }}>
                      <Home />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>10k+ Properties</Typography>
                      <Typography variant="caption" color="text.secondary">Ready to move in</Typography>
                    </Box>
                 </Card>

                 {/* Stylized UI presentation simulating the app using primary color aesthetics */}
                 <Box sx={{ 
                    bgcolor: 'white', borderRadius: 4, p: 2, 
                    boxShadow: '0 24px 48px -12px rgba(18, 11, 41, 0.15)',
                    border: '1px solid rgba(220, 224, 234, 0.8)',
                    height: 480, width: '100%',
                    background: 'linear-gradient(180deg, #ffffff 0%, #f4f6fa 100%)',
                    overflow: 'hidden', position: 'relative'
                 }}>
                    <Box sx={{ height: 220, bgcolor: 'primary.light', borderRadius: 3, mb: 3, background: 'url("https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80") center/cover' }} />
                    <Box sx={{ px: 2 }}>
                      <Chip label="Featured" color="secondary" size="small" sx={{ mb: 2, fontWeight: 600, borderRadius: 1 }} />
                      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Modern Penthouse Villa</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Makati City, Metro Manila</Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                        <Typography variant="h4" color="primary.main" sx={{ fontWeight: 800 }}>₱45k<Typography component="span" variant="body1" color="text.secondary">/mo</Typography></Typography>
                        <Button variant="contained" size="small" sx={{ borderRadius: 6, fontWeight: 600 }}>View Details</Button>
                      </Box>
                    </Box>
                 </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </Box>
  )
}

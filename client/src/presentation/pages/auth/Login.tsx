import { Box, Button, Card, Typography, Container, TextField, CircularProgress, Snackbar, Alert } from '@mui/material';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../application/context/AuthContext';
import logoPng from '../../../assets/logo.png';
import { Lock } from '@mui/icons-material';
import type { Role } from '../../../domain/entities/User';

/** Map a user role to the correct post-login landing route */
const getRoleRedirect = (role: Role): string => {
  switch (role) {
    case 'super_admin':
      return '/admin';
    case 'landlord':
    case 'staff':
      return '/hub';
    case 'user':
    default:
      return '/u';
  }
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorToast(null);
    
    try {
      const domainUser = await login(email, password);
      
      const origin = (location.state as { from?: { pathname: string } })?.from?.pathname;
      const baseTarget = getRoleRedirect(domainUser.role);

      // Prevent stale redirect bugs by validating origin ownership
      if (origin && origin.startsWith(baseTarget)) {
           navigate(origin, { replace: true });
      } else {
           navigate(baseTarget, { replace: true });
      }
    } catch (err: any) {
      setErrorToast(err.message || 'An unexpected error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Container maxWidth="xs">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box component="img" src={logoPng} alt="Logo" sx={{ height: 50, mb: 2, objectFit: 'contain' }} />
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: -0.5 }}>
            Sign in to RentDito
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Securely access your dashboard portal.
          </Typography>
        </Box>

        <Card sx={{ p: 4, borderRadius: 3, boxShadow: '0 12px 24px -10px rgba(0,0,0,0.1)' }}>
          <form onSubmit={handleLogin}>
            <TextField
              fullWidth
              id="login-email"
              label="Email Address"
              variant="outlined"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
              required
              disabled={isLoading}
            />
            
            <TextField
              fullWidth
              id="login-password"
              label="Password"
              variant="outlined"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 4 }}
              required
              disabled={isLoading}
            />

            <Button 
              type="submit"
              fullWidth 
              variant="contained" 
              size="large" 
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <Lock />}
              sx={{ py: 1.5, fontWeight: 700, fontSize: '1.05rem', boxShadow: 4 }}
            >
              {isLoading ? 'Authenticating...' : 'Secure Sign In'}
            </Button>
          </form>
        </Card>

        {/* Development Helper Box */}
        <Box sx={{ mt: 4, p: 3, bgcolor: 'rgba(90,49,232,0.05)', borderRadius: 2, border: '1px dashed rgba(90,49,232,0.3)' }}>
           <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main', display: 'block', mb: 1, textTransform: 'uppercase' }}>
             Development Test Accounts
           </Typography>
           <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', '& code': { bgcolor: 'background.paper', px: 1, borderRadius: 1 } }}>
             <strong>Super Admin:</strong> <code>admin@rentdito.com</code>
           </Typography>
           <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5, '& code': { bgcolor: 'background.paper', px: 1, borderRadius: 1 } }}>
             <strong>Landlord:</strong> <code>landlord@rentdito.com</code>
           </Typography>
           <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5, '& code': { bgcolor: 'background.paper', px: 1, borderRadius: 1 } }}>
             <strong>Password:</strong> <code>Password123!</code>
           </Typography>
        </Box>
      </Container>

      {/* Error Toast */}
      <Snackbar
        open={!!errorToast}
        autoHideDuration={5000}
        onClose={() => setErrorToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setErrorToast(null)}
          severity="error"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {errorToast}
        </Alert>
      </Snackbar>
    </Box>
  );
}

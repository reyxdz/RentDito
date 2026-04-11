import { Box, Button, Card, Typography, Container, TextField, Alert, CircularProgress, Link } from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import logoPng from '../../../assets/logo.png';
import { Email } from '@mui/icons-material';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Mock API call
      console.log('Forgot password payload:', { email });
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(true);
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
            Reset Password
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enter your email to receive a password reset link.
          </Typography>
        </Box>

        <Card sx={{ p: 4, borderRadius: 3, boxShadow: '0 12px 24px -10px rgba(0,0,0,0.1)' }}>
          {success ? (
            <Box sx={{ textAlign: 'center' }}>
                <Alert severity="success" sx={{ mb: 3 }}>
                    Check your email for the reset link!
                </Alert>
                <Button 
                    fullWidth 
                    variant="outlined" 
                    component={RouterLink} 
                    to="/login"
                    sx={{ py: 1.5, fontWeight: 600 }}
                >
                    Return to Login
                </Button>
            </Box>
          ) : (
            <form onSubmit={handleSubmit}>
                <TextField
                fullWidth
                label="Email Address"
                variant="outlined"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <Email />}
                sx={{ py: 1.5, fontWeight: 700, fontSize: '1.05rem', boxShadow: 4, mb: 3 }}
                >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>

                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        Remember your password?{' '}
                        <Link component={RouterLink} to="/login" sx={{ fontWeight: 600 }}>
                            Sign in here
                        </Link>
                    </Typography>
                </Box>
            </form>
          )}
        </Card>
      </Container>
    </Box>
  );
}

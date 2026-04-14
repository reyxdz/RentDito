import { Box, Button, Card, Typography, Container, TextField, Alert, CircularProgress } from '@mui/material';
import { useState } from 'react';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import logoPng from '../../../assets/logo.png';
import { LockReset } from '@mui/icons-material';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // If there is no token, show error or redirect
  if (!token) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <Container maxWidth="xs">
          <Alert severity="error" sx={{ mb: 3 }}>
            Invalid or missing reset token.
          </Alert>
          <Button fullWidth component={RouterLink} to="/login" variant="contained">
            Return to Login
          </Button>
        </Container>
      </Box>
    );
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const { authService } = await import('../../../infrastructure/services/AuthService');
      await authService.resetPassword(token || '', password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
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
            Enter your new password below.
          </Typography>
        </Box>

        <Card sx={{ p: 4, borderRadius: 3, boxShadow: '0 12px 24px -10px rgba(0,0,0,0.1)' }}>
          {success ? (
            <Alert severity="success" sx={{ mb: 3 }}>
              Password has been successfully reset! Redirecting to login...
            </Alert>
          ) : (
            <form onSubmit={handleReset}>
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <TextField
                fullWidth
                label="New Password"
                variant="outlined"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ mb: 2 }}
                required
                disabled={isLoading}
              />

              <TextField
                fullWidth
                label="Confirm New Password"
                variant="outlined"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <LockReset />}
                sx={{ py: 1.5, fontWeight: 700, fontSize: '1.05rem', boxShadow: 4 }}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}
        </Card>
      </Container>
    </Box>
  );
}

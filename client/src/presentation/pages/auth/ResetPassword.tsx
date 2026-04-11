import { Box, Button, Card, Typography, Container, TextField, Alert, CircularProgress } from '@mui/material';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import logoPng from '../../../assets/logo.png';
import { LockReset } from '@mui/icons-material';

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setIsLoading(false);
        return;
    }
    if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        setIsLoading(false);
        return;
    }
    
    try {
      // Mock API call
      console.log('Reset password payload:', { token, password });
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Redirect to login on success
      navigate('/login');
    } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
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
            Create New Password
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please enter your new password below.
          </Typography>
        </Box>

        <Card sx={{ p: 4, borderRadius: 3, boxShadow: '0 12px 24px -10px rgba(0,0,0,0.1)' }}>
            <form onSubmit={handleSubmit}>
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
                {isLoading ? 'Updating...' : 'Reset Password'}
                </Button>
            </form>
        </Card>
      </Container>
    </Box>
  );
}

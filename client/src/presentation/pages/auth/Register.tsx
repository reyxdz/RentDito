import { Box, Button, Card, Typography, Container, TextField, Alert, CircularProgress } from '@mui/material';
import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../../application/context/AuthContext';
import logoPng from '../../../assets/logo.png';
import { PersonAdd } from '@mui/icons-material';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [barangay, setBarangay] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [province, setProvince] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      await register({
        name: `${firstName} ${lastName}`.trim(),
        email,
        phone,
        password,
        confirmPassword,
      });
      
      navigate('/u', { replace: true });
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'An error occurred during registration.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="xs">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box component="img" src={logoPng} alt="Logo" sx={{ height: 50, mb: 2, objectFit: 'contain' }} />
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: -0.5 }}>
            Create an Account
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Join RentDito today.
          </Typography>
        </Box>

        <Card sx={{ p: 4, borderRadius: 3, boxShadow: '0 12px 24px -10px rgba(0,0,0,0.1)' }}>
          <form onSubmit={handleRegister}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField fullWidth label="First Name" variant="outlined" value={firstName} onChange={(e) => setFirstName(e.target.value)} required disabled={isLoading} />
              <TextField fullWidth label="Last Name" variant="outlined" value={lastName} onChange={(e) => setLastName(e.target.value)} required disabled={isLoading} />
            </Box>
            <TextField fullWidth label="Email Address" variant="outlined" type="email" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2 }} required disabled={isLoading} />
            <TextField fullWidth label="Phone Number" variant="outlined" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} sx={{ mb: 2 }} disabled={isLoading} />
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField fullWidth label="Barangay" variant="outlined" value={barangay} onChange={(e) => setBarangay(e.target.value)} required disabled={isLoading} />
              <TextField fullWidth label="Municipality / City" variant="outlined" value={municipality} onChange={(e) => setMunicipality(e.target.value)} required disabled={isLoading} />
            </Box>
            <TextField fullWidth label="Province" variant="outlined" value={province} onChange={(e) => setProvince(e.target.value)} sx={{ mb: 2 }} required disabled={isLoading} />
            <TextField fullWidth label="Password" variant="outlined" type="password" value={password} onChange={(e) => setPassword(e.target.value)} sx={{ mb: 2 }} required disabled={isLoading} />
            <TextField fullWidth label="Confirm Password" variant="outlined" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} sx={{ mb: 4 }} required disabled={isLoading} />

            <Button 
              type="submit"
              fullWidth 
              variant="contained" 
              size="large" 
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <PersonAdd />}
              sx={{ py: 1.5, fontWeight: 700, fontSize: '1.05rem', boxShadow: 4, mb: 2 }}
            >
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </Button>
            
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account? <RouterLink to="/login" style={{ color: '#5A31E8', textDecoration: 'none', fontWeight: 600 }}>Sign in</RouterLink>
              </Typography>
            </Box>
          </form>
        </Card>
      </Container>
    </Box>
  );
}

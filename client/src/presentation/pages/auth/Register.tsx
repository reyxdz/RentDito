import { Box, Button, Card, Typography, Container, TextField, Alert, CircularProgress, Link, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel } from '@mui/material';
import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import logoPng from '../../../assets/logo.png';
import { PersonAdd } from '@mui/icons-material';

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('landlord');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Basic validations
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
      const payload = {
          name, email, phone, password, role
      };
      console.log('Register payload:', payload);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect to login after successful registration mock
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box component="img" src={logoPng} alt="Logo" sx={{ height: 50, mb: 2, objectFit: 'contain' }} />
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: -0.5 }}>
            Create an Account
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Join RentDito to manage your properties or rentals.
          </Typography>
        </Box>

        <Card sx={{ p: 4, borderRadius: 3, boxShadow: '0 12px 24px -10px rgba(0,0,0,0.1)' }}>
          <form onSubmit={handleRegister}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
              <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>I am a...</FormLabel>
              <RadioGroup
                row
                value={role}
                onChange={(e) => setRole(e.target.value)}
                sx={{ justifyContent: 'center' }}
              >
                <FormControlLabel value="landlord" control={<Radio />} label="Landlord" />
                <FormControlLabel value="tenant" control={<Radio />} label="Tenant" />
              </RadioGroup>
            </FormControl>

            <TextField
              fullWidth
              label="Full Name"
              variant="outlined"
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ mb: 2 }}
              required
              disabled={isLoading}
            />

            <TextField
              fullWidth
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
              label="Phone Number"
              variant="outlined"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              sx={{ mb: 2 }}
              required
              disabled={isLoading}
            />
            
            <TextField
              fullWidth
              label="Password"
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
              label="Confirm Password"
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
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <PersonAdd />}
              sx={{ py: 1.5, fontWeight: 700, fontSize: '1.05rem', boxShadow: 4, mb: 2 }}
            >
              {isLoading ? 'Creating Account...' : 'Register'}
            </Button>
            
            <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    Already have an account?{' '}
                    <Link component={RouterLink} to="/login" sx={{ fontWeight: 600 }}>
                        Sign in here
                    </Link>
                </Typography>
            </Box>
          </form>
        </Card>
      </Container>
    </Box>
  );
}

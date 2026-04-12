import {
  Box,
  Button,
  Card,
  Typography,
  Container,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Link as MuiLink,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../../application/context/AuthContext';
import logoPng from '../../../assets/logo.png';
import { Lock } from '@mui/icons-material';
import type { Role } from '../../../domain/entities/User';

/** Map a user role to its default landing route after login */
const roleRedirect: Record<Role, string> = {
  super_admin: '/admin',
  landlord: '/hub',
  staff: '/hub',
  user: '/u',
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ── Form state ──────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ── Error toast (Snackbar) ──────────────────────────────
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showError = (msg: string) => {
    setToastMessage(msg);
    setToastOpen(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const domainUser = await login(email, password);

      // Determine where to send the user
      const baseTarget = roleRedirect[domainUser.role] ?? '/u';

      // If the user was redirected TO login from a protected page, honour that
      const origin = (location.state as { from?: { pathname: string } })?.from?.pathname;

      if (origin && origin.startsWith(baseTarget)) {
        navigate(origin, { replace: true });
      } else {
        navigate(baseTarget, { replace: true });
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'An unexpected error occurred during authentication.';
      showError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="xs">
        {/* ── Branding ─────────────────────────────────────────── */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            component="img"
            src={logoPng}
            alt="RentDito Logo"
            sx={{ height: 50, mb: 2, objectFit: 'contain' }}
          />
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: -0.5 }}
          >
            Sign in to RentDito
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Securely access your dashboard portal.
          </Typography>
        </Box>

        {/* ── Login Card ───────────────────────────────────────── */}
        <Card sx={{ p: 4, borderRadius: 3, boxShadow: '0 12px 24px -10px rgba(0,0,0,0.1)' }}>
          <form onSubmit={handleLogin}>
            <TextField
              id="login-email"
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
              id="login-password"
              fullWidth
              label="Password"
              variant="outlined"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 1 }}
              required
              disabled={isLoading}
            />

            {/* Forgot password link */}
            <Box sx={{ textAlign: 'right', mb: 3 }}>
              <MuiLink
                component={RouterLink}
                to="/forgot-password"
                variant="body2"
                underline="hover"
                sx={{ color: 'primary.main', fontWeight: 500 }}
              >
                Forgot password?
              </MuiLink>
            </Box>

            <Button
              id="login-submit"
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              startIcon={
                isLoading ? <CircularProgress size={20} color="inherit" /> : <Lock />
              }
              sx={{ py: 1.5, fontWeight: 700, fontSize: '1.05rem', boxShadow: 4 }}
            >
              {isLoading ? 'Authenticating...' : 'Secure Sign In'}
            </Button>
          </form>

          {/* Sign-up nudge */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Don&apos;t have an account?{' '}
              <MuiLink
                component={RouterLink}
                to="/register"
                underline="hover"
                sx={{ color: 'primary.main', fontWeight: 600 }}
              >
                Create one
              </MuiLink>
            </Typography>
          </Box>
        </Card>
      </Container>

      {/* ── Error Toast (Snackbar) ─────────────────────────── */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={5000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToastOpen(false)}
          severity="error"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

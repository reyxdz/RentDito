import { Box, Typography, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'background.default' }}>
      <Paper elevation={3} sx={{ p: 6, textAlign: 'center', borderRadius: 4, maxWidth: 500, width: '100%' }}>
        <ErrorOutlineIcon color="primary" sx={{ fontSize: 80, mb: 2 }} />
        <Typography variant="h3" fontWeight="bold" gutterBottom color="primary.main">
          404
        </Typography>
        <Typography variant="h5" fontWeight="medium" gutterBottom>
          Page Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </Typography>
        <Button variant="contained" color="primary" onClick={() => navigate('/')} sx={{ mt: 2 }}>
          Return to Home
        </Button>
      </Paper>
    </Box>
  );
}

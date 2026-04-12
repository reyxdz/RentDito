import { Box, Typography, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import BlockIcon from '@mui/icons-material/Block';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'background.default' }}>
      <Paper elevation={3} sx={{ p: 6, textAlign: 'center', borderRadius: 4, maxWidth: 500, width: '100%' }}>
        <BlockIcon color="error" sx={{ fontSize: 80, mb: 2 }} />
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          You do not have the required permissions to view this page. If you believe this is an error, please contact your administrator.
        </Typography>
        <Button variant="contained" color="primary" onClick={() => navigate('/')} sx={{ mt: 2 }}>
          Return to Home
        </Button>
      </Paper>
    </Box>
  );
}

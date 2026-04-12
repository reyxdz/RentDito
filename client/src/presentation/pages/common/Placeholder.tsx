import { Box, Typography, Button, Paper } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import ConstructionIcon from '@mui/icons-material/Construction';

export default function Placeholder() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Try to derive a friendly name from the path
  const derivedTitle = location.pathname.split('/').pop()?.replace(/-/g, ' ').toUpperCase() || 'PAGE';

  return (
    <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: 'background.paper', border: '1px dashed', borderColor: 'divider', maxWidth: 500, width: '100%' }}>
        <ConstructionIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {derivedTitle}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          This area is currently under construction. Please check back later when development is complete.
        </Typography>
        <Button variant="contained" color="primary" onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Paper>
    </Box>
  );
}

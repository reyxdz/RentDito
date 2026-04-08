import { Box, AppBar, Container, Toolbar, IconButton, Typography } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useColorMode } from '../context/ThemeContext';
import logoPng from '../../assets/logo.png';

export default function Navbar() {
  const navigate = useNavigate();
  const { mode, toggleColorMode } = useColorMode();

  return (
    <AppBar position="sticky" sx={{ pt: 1, pb: 1, boxShadow: 'none', borderBottom: '1px solid', borderColor: 'divider' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
          {/* Logo & Brand */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            <Box component="img" src={logoPng} alt="RentDito Logo" sx={{ height: 40, objectFit: 'contain' }} />
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', ml: 1, letterSpacing: -0.5 }}>
              RentDito
            </Typography>
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <IconButton onClick={toggleColorMode} sx={{ color: 'text.secondary' }}>
              {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

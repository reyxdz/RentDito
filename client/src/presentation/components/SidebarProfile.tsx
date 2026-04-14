import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, Avatar, Typography, Button, Tooltip, Menu, MenuItem, Divider, ListItemIcon, Chip
} from '@mui/material';
import { Menu as MenuIcon, Logout } from '@mui/icons-material';
import { useAuth } from '../../application/context/AuthContext';
import { useColorMode } from '../context/ThemeContext';

interface SidebarProfileProps {
  isCollapsed: boolean;
  isMdUp: boolean;
  subtitle?: string;
  chipLabel?: string;
  chipColor?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

export default function SidebarProfile({ isCollapsed, isMdUp, subtitle, chipLabel, chipColor }: SidebarProfileProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { mode } = useColorMode();

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    if (isCollapsed && isMdUp) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleMenuClose = () => setAnchorEl(null);

  return (
    <Box sx={{ p: isCollapsed && isMdUp ? 1 : 2 }}>
      <Card
        variant={isCollapsed && isMdUp ? 'elevation' : 'outlined'}
        sx={{
          bgcolor: isCollapsed && isMdUp ? 'transparent' : 'background.default',
          border: 'none', boxShadow: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}
      >
        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            p: isCollapsed && isMdUp ? 0.5 : 1, width: '100%',
            cursor: isCollapsed && isMdUp ? 'pointer' : 'default',
            borderRadius: 2,
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: mode === 'light' ? 'rgba(90, 49, 232, 0.04)' : 'rgba(255,255,255,0.04)',
            },
          }}
          onClick={handleProfileClick}
        >
          <Tooltip title={isCollapsed && isMdUp ? 'Profile Options' : ''} placement="right">
            <Avatar src={user?.avatar || undefined} sx={{ width: 40, height: 40, mx: 'auto' }} />
          </Tooltip>
          <Box sx={{
            flexGrow: 1, minWidth: 0,
            opacity: isCollapsed && isMdUp ? 0 : 1,
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            maxWidth: isCollapsed && isMdUp ? 0 : 200,
            overflow: 'hidden',
          }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name}
            </Typography>
            {chipLabel ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                <Chip
                  label={chipLabel}
                  size="small"
                  color={chipColor || 'primary'}
                  sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                />
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {subtitle || user?.email}
              </Typography>
            )}
          </Box>
        </Box>
        <Button
          fullWidth variant="text" color="error" size="small"
          onClick={() => logout()}
          sx={{
            mt: 1,
            opacity: isCollapsed && isMdUp ? 0 : 1,
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            pointerEvents: isCollapsed && isMdUp ? 'none' : 'auto',
            maxWidth: isCollapsed && isMdUp ? 0 : 200,
            minWidth: isCollapsed && isMdUp ? 0 : 64,
            overflow: 'hidden',
            px: isCollapsed && isMdUp ? 0 : 2,
            maxHeight: isCollapsed && isMdUp ? 0 : 40,
            py: isCollapsed && isMdUp ? 0 : undefined,
          }}
        >
          Sign Out
        </Button>
      </Card>

      <Menu
        anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{user?.name}</Typography>
          <Typography variant="caption" color="text.secondary">{subtitle || user?.email}</Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => { handleMenuClose(); navigate('profile'); }}>
          <ListItemIcon><MenuIcon fontSize="small" /></ListItemIcon>
          Profile
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { handleMenuClose(); logout(); }} sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ color: 'error.main' }}><Logout fontSize="small" /></ListItemIcon>
          Sign Out
        </MenuItem>
      </Menu>
    </Box>
  );
}

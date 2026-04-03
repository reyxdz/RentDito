import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, Drawer, AppBar, Toolbar, List, Typography, Divider, 
  IconButton, ListItem, ListItemButton, ListItemIcon, ListItemText, 
  useTheme, useMediaQuery, Avatar, Card, Button, Tooltip, Menu, MenuItem
} from '@mui/material';
import { 
  Menu as MenuIcon, Dashboard, People, HomeWork, 
  AccountBalanceWallet, BarChart, Gavel, Forum, 
  Settings, Security, Brightness4, Brightness7, Logout, ChevronLeft, ChevronRight
} from '@mui/icons-material';
import { useColorMode } from '../context/ThemeContext';
import { useAuth } from '../../application/context/AuthContext';
import logoPng from '../../assets/logo.png';

const drawerWidth = 280;
const collapsedDrawerWidth = 88;

const MENU_ITEMS = [
  { text: 'Overview', icon: <Dashboard />, path: '/admin' },
  { text: 'User Management', icon: <People />, path: '/admin/users' },
  { text: 'Properties & Listings', icon: <HomeWork />, path: '/admin/properties' },
  { text: 'Financials', icon: <AccountBalanceWallet />, path: '/admin/financials' },
  { text: 'Reporting & Analytics', icon: <BarChart />, path: '/admin/reports' },
  { text: 'Moderation', icon: <Gavel />, path: '/admin/moderation' },
  { text: 'Communications', icon: <Forum />, path: '/admin/communications' },
  { text: 'System', icon: <Settings />, path: '/admin/system' },
  { text: 'Security', icon: <Security />, path: '/admin/security' },
];

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up('md'));
  const { mode, toggleColorMode } = useColorMode();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    if (isSmUp) {
      setIsCollapsed(!isCollapsed);
    } else {
      setMobileOpen(!mobileOpen);
    }
  };

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    if (isCollapsed && isSmUp) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const activeDrawerWidth = (isSmUp && isCollapsed) ? collapsedDrawerWidth : drawerWidth;

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflowX: 'hidden' }}>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1, px: isCollapsed && isSmUp ? 0 : undefined, justifyContent: isCollapsed && isSmUp ? 'center' : 'flex-start' }}>
        <Box 
          component="img"
          src={logoPng}
          alt="RentDito Logo"
          sx={{ height: 36, objectFit: 'contain', ml: isCollapsed && isSmUp ? 0 : 0 }}
        />
        {!(isCollapsed && isSmUp) && (
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: -0.5 }}>
            Admin Panel
          </Typography>
        )}
      </Toolbar>
      <Divider sx={{ borderColor: mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' }} />
      <List sx={{ px: isCollapsed && isSmUp ? 1 : 2, pt: 2, flexGrow: 1 }}>
        {MENU_ITEMS.map((item) => {
          const isActive = location.pathname === item.path || 
                           (item.path !== '/admin' && location.pathname.startsWith(item.path));
                           
          const buttonContent = (
            <ListItemButton 
              onClick={() => {
                navigate(item.path);
                if (!isSmUp) setMobileOpen(false);
              }}
              sx={{ 
                borderRadius: 2,
                justifyContent: isCollapsed && isSmUp ? 'center' : 'flex-start',
                px: isCollapsed && isSmUp ? 0 : 2,
                bgcolor: isActive ? 'primary.main' : 'transparent',
                color: isActive ? 'white' : 'text.primary',
                '&:hover': {
                  bgcolor: isActive ? 'primary.dark' : (mode === 'light' ? 'rgba(90, 49, 232, 0.08)' : 'rgba(255,255,255,0.08)'),
                }
              }}
            >
              <ListItemIcon sx={{ 
                  minWidth: isCollapsed && isSmUp ? 0 : 40,
                  mr: isCollapsed && isSmUp ? 0 : 2, 
                  justifyContent: 'center',
                  color: isActive ? 'white' : 'inherit' 
              }}>
                {item.icon}
              </ListItemIcon>
              {!(isCollapsed && isSmUp) && (
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{ fontWeight: isActive ? 600 : 500, fontSize: '0.95rem' }} 
                />
              )}
            </ListItemButton>
          );

          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              {isCollapsed && isSmUp ? (
                 <Tooltip title={item.text} placement="right" arrow>
                   {buttonContent}
                 </Tooltip>
              ) : (
                buttonContent
              )}
            </ListItem>
          )
        })}
      </List>
      
      <Box sx={{ p: isCollapsed && isSmUp ? 1 : 2 }}>
        <Card 
          variant={isCollapsed && isSmUp ? 'elevation' : 'outlined'} 
          sx={{ 
            bgcolor: isCollapsed && isSmUp ? 'transparent' : 'background.default', 
            border: 'none', 
            boxShadow: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}
        >
           <Box 
             sx={{ 
               display: 'flex', alignItems: 'center', gap: 1.5, 
               p: isCollapsed && isSmUp ? 0.5 : 1, width: '100%',
               cursor: isCollapsed && isSmUp ? 'pointer' : 'default',
             }}
             onClick={handleProfileClick}
           >
              <Tooltip title={isCollapsed && isSmUp ? "Profile Options" : ""} placement="right">
                <Avatar src={user?.avatar} sx={{ width: 40, height: 40, mx: 'auto' }} />
              </Tooltip>
              {!(isCollapsed && isSmUp) && (
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</Typography>
                </Box>
              )}
           </Box>
           {!(isCollapsed && isSmUp) && (
             <Button fullWidth variant="text" color="error" size="small" onClick={() => logout()} sx={{ mt: 1 }}>
                Sign Out
             </Button>
           )}
        </Card>
        
        {/* Profile menu only on collapsed state */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} transformOrigin={{ horizontal: 'left', vertical: 'bottom' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
           <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{user?.name}</Typography>
              <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
           </Box>
           <Divider />
           <MenuItem onClick={() => { handleMenuClose(); logout(); }} sx={{ color: 'error.main' }}>
             <ListItemIcon sx={{ color: 'error.main' }}><Logout fontSize="small" /></ListItemIcon>
             Sign Out
           </MenuItem>
        </Menu>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: 'calc(100% - ' + activeDrawerWidth + 'px)' },
          ml: { md: activeDrawerWidth + 'px' },
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
          boxShadow: 'none',
        }}
      >
        <Toolbar>
          {/* Mobile Only menu button */}
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { xs: 'block', md: 'none' }, color: 'text.primary' }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, color: 'text.primary', fontWeight: 600 }}>
             {MENU_ITEMS.find(m => m.path === location.pathname)?.text || 'Dashboard'}
          </Typography>
          
          <IconButton onClick={toggleColorMode} sx={{ color: 'text.secondary' }}>
            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { md: activeDrawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant={isSmUp ? 'permanent' : 'temporary'}
          open={isSmUp ? true : mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: activeDrawerWidth, 
                bgcolor: 'background.paper',
                borderRight: 1,
                borderColor: mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
                overflowX: 'visible',
            },
          }}
        >
          {drawer}
        </Drawer>

        {isSmUp && (
          <IconButton
            onClick={() => setIsCollapsed(!isCollapsed)}
            size="small"
            sx={{
              position: 'fixed',
              top: '50%',
              left: activeDrawerWidth - 14,
              transform: 'translateY(-50%)',
              bgcolor: 'background.paper',
              border: 1,
              borderColor: mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
              boxShadow: 2,
              zIndex: theme.zIndex.drawer + 2,
              '&:hover': { bgcolor: 'action.hover' }
            }}
          >
            {isCollapsed ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}
          </IconButton>
        )}
      </Box>
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, p: 3, 
          width: { md: 'calc(100% - ' + activeDrawerWidth + 'px)' }, 
          pt: 10,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

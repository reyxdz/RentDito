import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, List, Typography, Divider,
  IconButton, ListItem, ListItemButton, ListItemIcon, ListItemText,
  useTheme, useMediaQuery, Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon, Brightness4, Brightness7,
  ChevronLeft, ChevronRight,
} from '@mui/icons-material';
import { useColorMode } from '../context/ThemeContext';
import { useAuth } from '../../application/context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import SidebarProfile from '../components/SidebarProfile';
import { USER_MENU_ITEMS, renderIcon } from '../../application/config/menuConfig';
import type { MenuItem as MenuItemType } from '../../application/config/menuConfig';
import logoPng from '../../assets/logo.png';

const drawerWidth = 280;
const collapsedDrawerWidth = 88;

export default function UserLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const { mode, toggleColorMode } = useColorMode();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Filter items by tenancy
  const visibleItems = USER_MENU_ITEMS.filter((item) => {
    if (item.requiresTenancy && !user?.activeTenancy) return false;
    return true;
  });

  const handleDrawerToggle = () => {
    if (isMdUp) {
      setIsCollapsed(!isCollapsed);
    } else {
      setMobileOpen(!mobileOpen);
    }
  };

  const activeDrawerWidth = (isMdUp && isCollapsed) ? collapsedDrawerWidth : drawerWidth;
  const borderColor = mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';

  const hasTenancy = !!user?.activeTenancy;

  // ─── Sidebar nav item renderer ─────────────────────────────────────
  const renderNavItem = (item: MenuItemType, idx: number) => {
    const isActive =
      location.pathname === item.path ||
      (item.path !== '/u' && location.pathname.startsWith(item.path));

    const showSectionLabel = item.sectionLabel && !(isCollapsed && isMdUp);

    const buttonContent = (
      <ListItemButton
        onClick={() => {
          navigate(item.path);
          if (!isMdUp) setMobileOpen(false);
        }}
        sx={{
          borderRadius: 2,
          justifyContent: isCollapsed && isMdUp ? 'center' : 'flex-start',
          px: isCollapsed && isMdUp ? 0 : 2,
          bgcolor: isActive ? 'primary.main' : 'transparent',
          color: isActive ? 'white' : 'text.primary',
          '&:hover': {
            bgcolor: isActive
              ? 'primary.dark'
              : mode === 'light'
                ? 'rgba(90, 49, 232, 0.08)'
                : 'rgba(255,255,255,0.08)',
          },
        }}
      >
        <ListItemIcon sx={{
          minWidth: isCollapsed && isMdUp ? 0 : 40,
          mr: isCollapsed && isMdUp ? 0 : 2,
          justifyContent: 'center',
          color: isActive ? 'white' : 'inherit',
        }}>
          {renderIcon(item.icon)}
        </ListItemIcon>
        <ListItemText
          primary={item.text}
          sx={{
            opacity: isCollapsed && isMdUp ? 0 : 1,
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            maxWidth: isCollapsed && isMdUp ? 0 : 200,
            overflow: 'hidden',
          }}
          primaryTypographyProps={{ fontWeight: isActive ? 600 : 500, fontSize: '0.95rem' }}
        />
      </ListItemButton>
    );

    return (
      <Box key={item.path}>
        {showSectionLabel && (
          <Typography
            variant="overline"
            sx={{
              display: 'block', px: 2, pt: idx === 0 ? 0 : 2.5, pb: 0.5,
              color: 'text.secondary', fontSize: '0.7rem', letterSpacing: 1.5, fontWeight: 700,
            }}
          >
            {item.sectionLabel}
          </Typography>
        )}
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          {isCollapsed && isMdUp ? (
            <Tooltip title={item.text} placement="right" arrow>
              {buttonContent}
            </Tooltip>
          ) : (
            buttonContent
          )}
        </ListItem>
      </Box>
    );
  };

  // ─── Drawer ─────────────────────────────────────────────────────────
  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflowX: 'hidden' }}>
      <Toolbar sx={{
        display: 'flex', alignItems: 'center', gap: 1, py: 1,
        px: isCollapsed && isMdUp ? 0 : undefined,
        justifyContent: isCollapsed && isMdUp ? 'center' : 'flex-start',
      }}>
        <Box
          component="img" src={logoPng} alt="RentDito Logo"
          sx={{ height: 36, objectFit: 'contain' }}
        />
        <Typography variant="h6" sx={{
          fontWeight: 800, color: 'primary.main', letterSpacing: -0.5,
          whiteSpace: 'nowrap',
          opacity: isCollapsed && isMdUp ? 0 : 1,
          transition: 'all 0.3s ease',
          maxWidth: isCollapsed && isMdUp ? 0 : 200,
          overflow: 'hidden',
        }}>
          My Account
        </Typography>
      </Toolbar>

      <Divider sx={{ borderColor }} />

      <List sx={{ px: isCollapsed && isMdUp ? 1 : 2, pt: 2, flexGrow: 1 }}>
        {visibleItems.map((item, idx) => renderNavItem(item, idx))}
      </List>

      {/* Profile footer */}
      <SidebarProfile
        isCollapsed={isCollapsed}
        isMdUp={isMdUp}
        subtitle={user?.email}
        chipLabel={hasTenancy ? "Active Tenant" : undefined}
        chipColor="success"
      />
    </Box>
  );

  // ─── Shell ─────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${activeDrawerWidth}px)` },
          ml: { md: `${activeDrawerWidth}px` },
          bgcolor: 'background.paper',
          borderBottom: 1, borderColor,
          boxShadow: 'none',
          transition: 'width 0.3s ease, margin 0.3s ease',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit" edge="start" onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { xs: 'block', md: 'none' }, color: 'text.primary' }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, color: 'text.primary', fontWeight: 600 }}>
            {visibleItems.find(m => m.path === location.pathname)?.text || 'My Account'}
          </Typography>

          <NotificationBell />

          <IconButton onClick={toggleColorMode} sx={{ color: 'text.secondary' }}>
            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: activeDrawerWidth }, flexShrink: { md: 0 }, transition: 'width 0.3s ease' }}
      >
        <Drawer
          variant={isMdUp ? 'permanent' : 'temporary'}
          open={isMdUp ? true : mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: activeDrawerWidth,
              bgcolor: 'background.paper',
              borderRight: 1, borderColor,
              overflowX: 'visible',
              transition: 'width 0.3s ease',
            },
          }}
        >
          {drawer}
        </Drawer>

        {isMdUp && (
          <IconButton
            onClick={() => setIsCollapsed(!isCollapsed)}
            size="small"
            sx={{
              position: 'fixed',
              top: '50%',
              left: activeDrawerWidth - 14,
              transform: 'translateY(-50%)',
              bgcolor: 'background.paper',
              border: 1, borderColor,
              boxShadow: 2,
              zIndex: theme.zIndex.drawer + 2,
              transition: 'left 0.3s ease',
              '&:hover': { bgcolor: 'action.hover' },
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
          width: { md: `calc(100% - ${activeDrawerWidth}px)` },
          pt: 10,
          transition: 'width 0.3s ease',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

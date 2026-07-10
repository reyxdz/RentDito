import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Button,
  Divider,
  ListItemIcon,
  useTheme,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useNotification, type Notification } from '../../application/context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const theme = useTheme();

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (id: string, read: boolean) => {
    if (!read) markAsRead(id);
    // Potential future action like navigating to a specific page
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;

  const getIconForType = (type?: 'info' | 'success' | 'warning' | 'error') => {
    switch (type) {
      case 'success':
        return <SuccessIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'info':
      default:
        return <InfoIcon color="info" />;
    }
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen}>
        <Badge badgeContent={unreadCount} color="error">
          {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
        </Badge>
      </IconButton>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: { xs: '92vw', sm: 360 },
            maxHeight: 480,
            mt: 1.5,
            borderRadius: 2,
            boxShadow: theme.shadows[4],
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
          <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={markAllAsRead} sx={{ textTransform: 'none', fontWeight: 600 }}>
              Mark all as read
            </Button>
          )}
        </Box>
        <Divider />
        <List sx={{ p: 0 }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <NotificationsNoneIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">You're all caught up!</Typography>
            </Box>
          ) : (
            notifications.map((notification: Notification) => (
              <ListItemButton
                key={notification.id}
                alignItems="flex-start"
                onClick={() => handleNotificationClick(notification.id, notification.read)}
                sx={{
                  bgcolor: notification.read ? 'transparent' : 'action.hover',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                  {getIconForType(notification.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: notification.read ? 500 : 700,
                        color: notification.read ? 'text.secondary' : 'text.primary',
                      }}
                    >
                      {notification.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.5, mb: 1 }}
                      >
                        {notification.message}
                      </Typography>
                      <Typography component="span" variant="caption" color="text.disabled">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </Typography>
                    </>
                  }
                />
                {!notification.read && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      bgcolor: 'primary.main',
                      borderRadius: '50%',
                      mt: 1,
                    }}
                  />
                )}
              </ListItemButton>
            ))
          )}
        </List>
      </Popover>
    </>
  );
}

import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        py: 8, 
        px: 3,
        textAlign: 'center',
        bgcolor: 'background.paper',
        borderRadius: 3,
        border: '1px dashed',
        borderColor: 'divider'
      }}
    >
      {icon && (
        <Box sx={{ mb: 2, color: 'text.disabled', '& > svg': { fontSize: 64 } }}>
          {icon}
        </Box>
      )}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: 3 }}>
        {description}
      </Typography>
      {action && (
        <Box>
          {action}
        </Box>
      )}
    </Box>
  );
}

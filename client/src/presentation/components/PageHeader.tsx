import { Box, Typography, Button } from '@mui/material';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  onAction?: () => void;
  actionIcon?: ReactNode;
}

export default function PageHeader({ title, subtitle, actionText, onAction, actionIcon }: PageHeaderProps) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body1" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {actionText && onAction && (
        <Button 
          variant="contained" 
          color="primary" 
          onClick={onAction}
          startIcon={actionIcon}
          sx={{ fontWeight: 600, px: 3, py: 1 }}
        >
          {actionText}
        </Button>
      )}
    </Box>
  );
}

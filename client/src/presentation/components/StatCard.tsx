import type { ReactNode } from 'react';
import { Card, CardContent, Typography, Box, alpha } from '@mui/material';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

export default function StatCard({ title, value, icon, color = 'primary' }: StatCardProps) {
  return (
    <Card sx={{ height: '100%', boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3, '&:last-child': { pb: 3 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 2,
            bgcolor: (theme) => alpha(theme.palette[color].main, 0.1),
            color: `${color}.main`,
            '& svg': { fontSize: 32 }
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight="medium" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold" color="text.primary">
            {value}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

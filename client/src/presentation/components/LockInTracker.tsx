import { Box, Typography, LinearProgress, linearProgressClasses, useTheme } from '@mui/material';
import { CheckCircleRounded, WarningRounded, ErrorRounded } from '@mui/icons-material';

interface LockInTrackerProps {
  monthsElapsed: number;
  monthsTotal: number;
  startDate: string | Date;
  endDate: string | Date;
}

export default function LockInTracker({ monthsElapsed, monthsTotal, startDate, endDate }: LockInTrackerProps) {
  const theme = useTheme();
  
  // Cap progress between 0 and total
  const clampedElapsed = Math.max(0, Math.min(monthsElapsed, monthsTotal));
  const progressPercent = monthsTotal > 0 ? (clampedElapsed / monthsTotal) * 100 : 0;
  const isCompleted = clampedElapsed >= monthsTotal;
  const monthsRemaining = monthsTotal - clampedElapsed;

  // Determine colors based on progress
  let statusColor = theme.palette.success.main;
  let StatusIcon = CheckCircleRounded;

  if (!isCompleted) {
    if (progressPercent < 50) {
      statusColor = theme.palette.info.main; // Early stage
      StatusIcon = CheckCircleRounded;
    } else if (progressPercent < 80) {
      statusColor = theme.palette.warning.main; // Mid stage
      StatusIcon = WarningRounded;
    } else {
      statusColor = theme.palette.error.main; // Near end stage
      StatusIcon = ErrorRounded;
    }
  }

  // Format dates
  const formatOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  const start = new Date(startDate).toLocaleDateString(undefined, formatOptions);
  const end = new Date(endDate).toLocaleDateString(undefined, formatOptions);

  return (
    <Box sx={{ width: '100%', py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Lock-in Period</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: statusColor }}>
          <StatusIcon fontSize="small" />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {isCompleted ? 'Completed' : `${monthsRemaining} months remaining`}
          </Typography>
        </Box>
      </Box>

      <LinearProgress 
        variant="determinate" 
        value={progressPercent} 
        sx={{
          height: 12,
          borderRadius: 6,
          backgroundColor: theme.palette.grey[200],
          [`& .${linearProgressClasses.bar}`]: {
            borderRadius: 6,
            backgroundColor: isCompleted ? theme.palette.success.main : theme.palette.primary.main,
          }
        }}
      />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Started: {start}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {clampedElapsed} / {monthsTotal} months
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Ends: {end}
        </Typography>
      </Box>
    </Box>
  );
}

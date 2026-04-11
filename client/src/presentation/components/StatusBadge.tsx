import { Chip, ChipProps } from '@mui/material';

interface StatusBadgeProps extends Omit<ChipProps, 'color'> {
  status: string;
}

export default function StatusBadge({ status, ...props }: StatusBadgeProps) {
  const getStatusColor = (statusText: string): ChipProps['color'] => {
    switch (statusText.toLowerCase()) {
      case 'active':
      case 'completed':
      case 'success':
      case 'approved':
      case 'paid':
        return 'success';
      case 'pending':
      case 'in progress':
      case 'warning':
        return 'warning';
      case 'error':
      case 'failed':
      case 'cancelled':
      case 'overdue':
        return 'error';
      case 'inactive':
      case 'draft':
      default:
        return 'default';
    }
  };

  return (
    <Chip 
      label={status} 
      color={getStatusColor(status)} 
      size="small" 
      sx={{ fontWeight: 600, textTransform: 'capitalize' }}
      {...props} 
    />
  );
}

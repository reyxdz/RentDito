import { Chip, type ChipProps } from '@mui/material';

export interface StatusBadgeProps extends Omit<ChipProps, 'color'> {
  status: string;
}

export default function StatusBadge({ status, ...props }: StatusBadgeProps) {
  let color: ChipProps['color'] = 'default';
  
  const normalizedStatus = status.toLowerCase();
  
  if (['active', 'approved', 'completed', 'success', 'paid', 'signed'].includes(normalizedStatus)) {
    color = 'success';
  } else if (['pending', 'reviewing', 'processing', 'in progress', 'pending_review', 'pending_signature'].includes(normalizedStatus)) {
    color = 'warning';
  } else if (['rejected', 'cancelled', 'failed', 'error', 'inactive'].includes(normalizedStatus)) {
    color = 'error';
  } else if (['info', 'new', 'draft'].includes(normalizedStatus)) {
    color = 'info';
  }

  return <Chip label={status} color={color} size="small" sx={{ fontWeight: 600, textTransform: 'capitalize' }} {...props} />;
}

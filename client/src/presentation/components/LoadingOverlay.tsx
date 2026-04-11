import { Backdrop, CircularProgress, Typography } from '@mui/material';

interface LoadingOverlayProps {
  open: boolean;
  message?: string;
}

export default function LoadingOverlay({ open, message = 'Loading...' }: LoadingOverlayProps) {
  return (
    <Backdrop
      sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, display: 'flex', flexDirection: 'column', gap: 2 }}
      open={open}
    >
      <CircularProgress color="inherit" />
      <Typography variant="h6" component="div">
        {message}
      </Typography>
    </Backdrop>
  );
}

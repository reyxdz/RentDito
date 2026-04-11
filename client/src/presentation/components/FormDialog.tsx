import type { ReactNode, FormEvent } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Box } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

export interface FormDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export default function FormDialog({
  open,
  title,
  children,
  onClose,
  onSubmit,
  submitText = 'Save',
  cancelText = 'Cancel',
  loading = false,
  maxWidth = 'sm'
}: FormDialogProps) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth={maxWidth} fullWidth>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {title}
          <IconButton disabled={loading} onClick={onClose} edge="end" size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {children}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={loading} sx={{ fontWeight: 'medium' }}>
            {cancelText}
          </Button>
          <Button type="submit" variant="contained" color="primary" disabled={loading} disableElevation sx={{ fontWeight: 'bold' }}>
            {loading ? 'Saving...' : submitText}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

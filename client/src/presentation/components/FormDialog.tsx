import React, { forwardRef } from 'react';
import type { ReactNode, FormEvent } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Box, Slide, CircularProgress } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { TransitionProps } from '@mui/material/transitions';

const Transition = forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

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
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth={maxWidth}
      fullWidth
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: { borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }
      }}
    >
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 2 }}>
          {title}
          <IconButton disabled={loading} onClick={onClose} edge="end" size="small" sx={{ bgcolor: 'action.hover' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4 }}>
          {children}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2.5, bgcolor: 'background.default' }}>
          <Button onClick={onClose} color="inherit" disabled={loading} sx={{ fontWeight: 600, color: 'text.secondary' }}>
            {cancelText}
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            disableElevation
            sx={{ fontWeight: 600, minWidth: 100 }}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading ? 'Saving...' : submitText}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

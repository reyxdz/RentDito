import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export default function ConfirmDialog({ 
  open, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel', 
  onConfirm, 
  onCancel,
  isDestructive = false
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      PaperProps={{
          sx: { borderRadius: 2, minWidth: { xs: '90%', sm: '400px' } }
      }}
    >
      <DialogTitle id="confirm-dialog-title" sx={{ fontWeight: 700 }}>
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="confirm-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel} color="inherit" sx={{ fontWeight: 600 }}>
          {cancelText}
        </Button>
        <Button 
          onClick={onConfirm} 
          color={isDestructive ? 'error' : 'primary'} 
          variant="contained" 
          autoFocus={!isDestructive}
          sx={{ fontWeight: 600, boxShadow: 2 }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

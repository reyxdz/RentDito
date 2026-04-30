import { useState } from 'react';
import { Box, Typography, Button, Alert, List, ListItem, ListItemIcon, ListItemText, CircularProgress, Divider } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import type { Tenancy } from '../../../../domain/entities/Tenancy';

interface CheckoutFlowProps {
  tenancy: Tenancy;
  onComplete: () => Promise<void>;
  onCancel: () => void;
}

export default function CheckoutFlow({ tenancy, onComplete, onCancel }: CheckoutFlowProps) {
  const [loading, setLoading] = useState(false);

  // Mocking the checklist resolution status for demonstration
  // In a real scenario, these would be derived from billing/inventory services
  const checklist = [
    {
      id: 'bills',
      title: 'Outstanding Bills Cleared',
      description: 'Ensure the tenant has paid all utility bills, rent, and penalties.',
      resolved: true, // mock
    },
    {
      id: 'inventory',
      title: 'Inventory Items Returned',
      description: 'Keys, appliances, and provided furniture are returned in good condition.',
      resolved: false, // mock to show warning
    },
    {
      id: 'contract',
      title: 'Contract Terms Met',
      description: 'Confirm there are no early termination penalties applicable.',
      resolved: true, // mock
    }
  ];

  const allResolved = checklist.every(item => item.resolved);

  const handleConfirm = async () => {
    setLoading(true);
    await onComplete();
    setLoading(false);
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          You are about to check out tenant <strong>{tenancy.personalDetails?.fullName || tenancy.user?.name}</strong>.
          Please complete the pre-checkout checklist before finalizing this process.
        </Typography>

        {!allResolved && (
          <Alert severity="warning" icon={<WarningIcon />} sx={{ borderRadius: 2, mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={700}>Attention Required</Typography>
            <Typography variant="body2">There are unresolved items in the checklist. You can override this, but it is not recommended.</Typography>
          </Alert>
        )}
      </Box>

      <List sx={{ bgcolor: 'background.default', borderRadius: 2, p: 1 }}>
        {checklist.map((item) => (
          <ListItem key={item.id} sx={{ bgcolor: 'background.paper', mb: 1, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <ListItemIcon>
              {item.resolved ? (
                <CheckCircleIcon color="success" />
              ) : (
                <CancelIcon color="error" />
              )}
            </ListItemIcon>
            <ListItemText
              primary={<Typography variant="subtitle2" fontWeight={700}>{item.title}</Typography>}
              secondary={<Typography variant="body2">{item.description}</Typography>}
            />
            {!item.resolved && (
              <Box sx={{ ml: 2 }}>
                <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700, bgcolor: 'error.50', px: 1, py: 0.5, borderRadius: 1 }}>
                  UNRESOLVED
                </Typography>
              </Box>
            )}
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button onClick={onCancel} disabled={loading} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleConfirm}
          disabled={loading}
          sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', px: 3 }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Confirm Checkout'}
        </Button>
      </Box>
    </Box>
  );
}

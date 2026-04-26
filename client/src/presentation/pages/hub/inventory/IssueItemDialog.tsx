import { useState, useEffect } from 'react';
import { Box, TextField, MenuItem, Typography } from '@mui/material';
import FormDialog from '../../../components/FormDialog';
import type { Inventory } from '../../../../domain/entities/Inventory';

interface IssueItemDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  item: Inventory | null;
}

export default function IssueItemDialog({ open, onClose, onSubmit, item }: IssueItemDialogProps) {
  const [tenancyId, setTenancyId] = useState('');
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTenancyId('');
      setIssuedDate(new Date().toISOString().split('T')[0]);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    
    setLoading(true);
    try {
      await onSubmit({
        inventoryItemId: item.id,
        tenancyId,
        issuedByUserId: 'staff_1', // Mock auto-filled user logic
        issuedDate
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDialog
      open={open}
      title="Issue Item to Tenancy"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText="Issue Item"
      loading={loading}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {item && (
          <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">Issuing Item</Typography>
            <Typography variant="subtitle1" fontWeight={600}>{item.itemName}</Typography>
            {item.serialNumber && <Typography variant="caption">{item.serialNumber}</Typography>}
          </Box>
        )}

        <TextField
          select
          label="Assign to Tenancy / Unit"
          value={tenancyId}
          onChange={(e) => setTenancyId(e.target.value)}
          required
          fullWidth
          autoFocus
        >
          {/* Mock Tenancy mappings */}
          <MenuItem value="t1">Unit 501 - John Doe</MenuItem>
          <MenuItem value="t2">Unit 502 - Sarah Smith</MenuItem>
          <MenuItem value="t3">Unit 503 - Vacant Checkout</MenuItem>
        </TextField>

        <TextField
          label="Issued Date"
          type="date"
          value={issuedDate}
          onChange={(e) => setIssuedDate(e.target.value)}
          required
          fullWidth
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          label="Caretaker / Issuer"
          value="Jane Staff (Auto-filled)"
          disabled
          fullWidth
        />
      </Box>
    </FormDialog>
  );
}

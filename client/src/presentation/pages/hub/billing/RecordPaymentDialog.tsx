import React, { useState } from 'react';
import { TextField, MenuItem, InputAdornment, Box, Typography } from '@mui/material';
import FormDialog from '../../../components/FormDialog';
import type { PaymentMethod } from '../../../../domain/entities/Payment';
import type { Bill } from '../../../../domain/entities/Bill';

interface RecordPaymentDialogProps {
  open: boolean;
  bill: Bill | null;
  onClose: () => void;
  onSubmit: (data: { amount: number; method: PaymentMethod; referenceNumber: string; notes: string }) => Promise<void>;
}

export default function RecordPaymentDialog({ open, bill, onClose, onSubmit }: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState<number | string>(bill?.balanceAmount || 0);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Update amount if bill changes
  React.useEffect(() => {
    if (bill && open) {
      setAmount(bill.balanceAmount);
      setMethod('cash');
      setReferenceNumber('');
      setNotes('');
    }
  }, [bill, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bill) return;

    setLoading(true);
    try {
      await onSubmit({
        amount: Number(amount),
        method,
        referenceNumber,
        notes
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!bill) return null;

  return (
    <FormDialog
      open={open}
      title="Record Payment"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText="Confirm Payment"
      loading={loading}
      maxWidth="sm"
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary">Current Balance</Typography>
          <Typography variant="h5" fontWeight={700} color="primary.main">
            ₱{bill.balanceAmount.toLocaleString()}
          </Typography>
        </Box>

        <TextField
          label="Payment Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          fullWidth
          InputProps={{
            startAdornment: <InputAdornment position="start">₱</InputAdornment>,
          }}
        />

        <TextField
          select
          label="Payment Method"
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          required
          fullWidth
        >
          <MenuItem value="cash">Cash</MenuItem>
          <MenuItem value="gcash">GCash</MenuItem>
          <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
          <MenuItem value="other">Other</MenuItem>
        </TextField>

        <TextField
          label="Reference Number (Optional)"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          fullWidth
          placeholder="e.g. Transaction ID, Receipt No."
        />

        <TextField
          label="Notes (Optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          rows={3}
          fullWidth
        />
      </Box>
    </FormDialog>
  );
}

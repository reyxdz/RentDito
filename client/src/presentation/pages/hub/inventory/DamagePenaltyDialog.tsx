import { useState, useEffect } from 'react';
import { Box, TextField, MenuItem, Typography, FormControlLabel, Switch } from '@mui/material';
import FormDialog from '../../../components/FormDialog';
import type { InventoryRecord } from '../../../../domain/entities/InventoryRecord';

interface DamagePenaltyDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  record: InventoryRecord | null;
}

export default function DamagePenaltyDialog({ open, onClose, onSubmit, record }: DamagePenaltyDialogProps) {
  const [returnCondition, setReturnCondition] = useState('good');
  const [damageNotes, setDamageNotes] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState<number | ''>('');
  const [deductedFromDeposit, setDeductedFromDeposit] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setReturnCondition('good');
      setDamageNotes('');
      setPenaltyAmount('');
      setDeductedFromDeposit(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        returnCondition,
        damageNotes,
        penaltyAmount: penaltyAmount === '' ? 0 : Number(penaltyAmount),
        deductedFromDeposit: penaltyAmount !== '' && Number(penaltyAmount) > 0 ? deductedFromDeposit : false
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
      title="Return Item & Evaluate Damage"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText="Confirm Return"
      loading={loading}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {record && record.inventoryItem && (
          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">Item to return:</Typography>
            <Typography variant="subtitle1" fontWeight={600}>{record.inventoryItem.itemName}</Typography>
          </Box>
        )}

        <TextField
          select
          label="Return Condition"
          value={returnCondition}
          onChange={(e) => setReturnCondition(e.target.value)}
          required
          fullWidth
          autoFocus
        >
          <MenuItem value="good">Good (No new damage)</MenuItem>
          <MenuItem value="fair">Fair (Normal Wear)</MenuItem>
          <MenuItem value="damaged">Damaged (Requires Action)</MenuItem>
          <MenuItem value="lost">Lost / Unreturned</MenuItem>
        </TextField>

        {(returnCondition === 'damaged' || returnCondition === 'lost') && (
          <>
            <TextField
              label="Damage/Loss Notes"
              multiline
              rows={3}
              value={damageNotes}
              onChange={(e) => setDamageNotes(e.target.value)}
              placeholder="Describe the issue... (optional)"
              fullWidth
            />

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                label="Penalty Amount (₱)"
                type="number"
                value={penaltyAmount}
                onChange={(e) => setPenaltyAmount(e.target.value === '' ? '' : Number(e.target.value))}
                fullWidth
              />
              <FormControlLabel
                control={
                  <Switch 
                    checked={deductedFromDeposit} 
                    onChange={(e) => setDeductedFromDeposit(e.target.checked)}
                    disabled={penaltyAmount === '' || Number(penaltyAmount) <= 0}
                  />
                }
                label="Deduct from Deposit"
                sx={{ whiteSpace: 'nowrap' }}
              />
            </Box>
          </>
        )}
      </Box>
    </FormDialog>
  );
}

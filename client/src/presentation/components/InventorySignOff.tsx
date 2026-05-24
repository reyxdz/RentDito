import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  FormControlLabel,
  Checkbox,
  Paper,
  Divider,
} from '@mui/material';
import { CheckCircleOutline as CheckCircleIcon } from '@mui/icons-material';
import SignaturePad from './SignaturePad';
import DataTable from './DataTable';
import StatusBadge from './StatusBadge';
import type { InventoryRecord } from '../../domain/entities/InventoryRecord';

interface InventorySignOffProps {
  records: InventoryRecord[];
  onSubmit: (signatureData: string) => Promise<void>;
  isSubmitting?: boolean;
}

export default function InventorySignOff({ records, onSubmit, isSubmitting = false }: InventorySignOffProps) {
  const [signature, setSignature] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSigned, setIsSigned] = useState(false);

  const handleSubmit = async () => {
    if (!signature || !acknowledged) return;
    await onSubmit(signature);
    setIsSigned(true);
  };

  const columns = [
    { key: 'itemName', header: 'Item Name', render: (row: InventoryRecord) => row.inventoryItem?.itemName || 'Unknown Item' },
    { key: 'quantityIssued', header: 'Qty' },
    { key: 'issuedCondition', header: 'Condition', render: (row: InventoryRecord) => <StatusBadge status={row.issuedCondition} /> },
  ];

  if (isSigned) {
    return (
      <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, textAlign: 'center', bgcolor: 'success.50' }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Inventory Acknowledged
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Thank you for signing off on your issued inventory items. This record has been saved.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Acknowledge Inventory Receipt
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Please review the items listed below that have been issued to your unit. Sign to acknowledge that you have received them in the stated condition.
      </Typography>

      <Box sx={{ mb: 4 }}>
        <DataTable
          columns={columns}
          data={records}
          keyExtractor={(row) => row.id}
          isLoading={false}
          pagination={false}
        />
      </Box>

      <Divider sx={{ mb: 4 }} />

      <Box sx={{ maxWidth: 600, mx: 'auto' }}>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Tenant Signature
        </Typography>
        <SignaturePad onSignatureChange={setSignature} height={150} />

        <Box sx={{ mt: 3, mb: 4 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="body2" color="text.secondary">
                I acknowledge that I have received the items listed above in the condition stated. I understand that I am responsible for these items during my tenancy and may be liable for any damage or loss upon check-out.
              </Typography>
            }
            sx={{ alignItems: 'flex-start' }}
          />
        </Box>

        <Button
          variant="contained"
          fullWidth
          size="large"
          disabled={!signature || !acknowledged || isSubmitting}
          onClick={handleSubmit}
          sx={{ fontWeight: 600, py: 1.5, borderRadius: 2 }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Sign-Off'}
        </Button>
      </Box>
    </Paper>
  );
}

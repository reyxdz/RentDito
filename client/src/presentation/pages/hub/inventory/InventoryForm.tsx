import { useState, useEffect } from 'react';
import { Box, TextField, MenuItem } from '@mui/material';
import FormDialog from '../../../components/FormDialog';
import type { Inventory, InventoryCondition, InventoryStatus } from '../../../../domain/entities/Inventory';

interface InventoryFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Inventory>) => Promise<void>;
  initialData?: Inventory;
}

export default function InventoryForm({ open, onClose, onSubmit, initialData }: InventoryFormProps) {
  const [itemName, setItemName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [condition, setCondition] = useState<InventoryCondition>('new');
  const [quantity, setQuantity] = useState<number>(1);
  const [status, setStatus] = useState<InventoryStatus>('available');
  const [propertyId, setPropertyId] = useState('p1');
  
  const [purchaseCost, setPurchaseCost] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setItemName(initialData.itemName || '');
        setSerialNumber(initialData.serialNumber || '');
        setCondition(initialData.condition || 'new');
        setQuantity(initialData.quantity || 1);
        setStatus(initialData.status || 'available');
        setPropertyId(initialData.propertyId || 'p1');
        setPurchaseCost(initialData.purchaseCost || '');
      } else {
        setItemName('');
        setSerialNumber('');
        setCondition('new');
        setQuantity(1);
        setStatus('available');
        setPropertyId('p1');
        setPurchaseCost('');
      }
    }
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        itemName,
        serialNumber,
        condition,
        quantity,
        status,
        propertyId,
        purchaseCost: purchaseCost === '' ? undefined : Number(purchaseCost)
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
      title={initialData ? 'Edit Inventory Item' : 'Add Inventory Item'}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={initialData ? 'Save Changes' : 'Add Item'}
      loading={loading}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Item Name"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          required
          fullWidth
          autoFocus
        />
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            select
            label="Property"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            required
            fullWidth
          >
            <MenuItem value="p1">White Dorm</MenuItem>
            <MenuItem value="p2">Uytengso</MenuItem>
          </TextField>
          
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as InventoryStatus)}
            required
            fullWidth
          >
            <MenuItem value="available">Available</MenuItem>
            <MenuItem value="issued">Issued</MenuItem>
            <MenuItem value="maintenance">Maintenance</MenuItem>
            <MenuItem value="retired">Retired</MenuItem>
          </TextField>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Serial Number (Optional)"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            fullWidth
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
            fullWidth
            inputProps={{ min: 1 }}
          />

          <TextField
            select
            label="Condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value as InventoryCondition)}
            required
            fullWidth
          >
            <MenuItem value="new">New</MenuItem>
            <MenuItem value="good">Good</MenuItem>
            <MenuItem value="fair">Fair</MenuItem>
            <MenuItem value="poor">Poor</MenuItem>
            <MenuItem value="damaged">Damaged</MenuItem>
          </TextField>
        </Box>

        <TextField
          label="Purchase Cost (₱)"
          type="number"
          value={purchaseCost}
          onChange={(e) => setPurchaseCost(e.target.value === '' ? '' : Number(e.target.value))}
          fullWidth
        />
      </Box>
    </FormDialog>
  );
}

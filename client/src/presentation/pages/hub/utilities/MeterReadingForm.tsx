import { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  MenuItem, 
  Typography, 
  InputAdornment, 
  Divider,
} from '@mui/material';
import { EvStation, Opacity } from '@mui/icons-material';
import FormDialog from '../../../components/FormDialog';
import type { UtilityType } from '../../../../domain/entities/UtilityReading';
import { useUtilities } from '../../../../application/hooks/useUtilities';

interface MeterReadingFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export default function MeterReadingForm({ open, onClose, onSubmit }: MeterReadingFormProps) {
  const { getLatestReading } = useUtilities();
  
  const [unitId, setUnitId] = useState('u1');
  const [type, setType] = useState<UtilityType>('electricity');
  const [previousReading, setPreviousReading] = useState<number>(0);
  const [currentReading, setCurrentReading] = useState<number | string>('');
  const [ratePerUnit, setRatePerUnit] = useState<number>(12); // Mock default 12 php per kWh
  const [loading, setLoading] = useState(false);

  // Auto-fetch latest reading whenever unit or type changes
  useEffect(() => {
    if (open) {
      setLoading(true);
      getLatestReading(unitId, type).then((reading) => {
        setPreviousReading(reading ? reading.currentReading : 0);
        setCurrentReading('');
        // Adjust mock rate based on utility
        setRatePerUnit(type === 'electricity' ? 12 : (type === 'water' ? 60 : 1500));
        setLoading(false);
      });
    }
  }, [open, unitId, type, getLatestReading]);

  const consumption = Math.max(0, Number(currentReading) - previousReading);
  const cost = consumption * ratePerUnit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        unitId,
        type,
        previousReading,
        currentReading: Number(currentReading),
        consumption,
        ratePerUnit,
        totalCost: cost,
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDialog
      open={open}
      title="Record Meter Reading"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText="Save Reading"
      loading={loading}
      maxWidth="sm"
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            select
            label="Unit"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            fullWidth
            required
          >
            {/* Mock Units for Dashboard Visualization */}
            <MenuItem value="u1">Room 501</MenuItem>
            <MenuItem value="u2">Room 502</MenuItem>
            <MenuItem value="u3">Room 405</MenuItem>
          </TextField>

          <TextField
            select
            label="Utility Type"
            value={type}
            onChange={(e) => setType(e.target.value as UtilityType)}
            fullWidth
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {type === 'electricity' ? <EvStation color="warning" /> : <Opacity color="info" />}
                </InputAdornment>
              ),
            }}
          >
            <MenuItem value="electricity">Electricity (kWh)</MenuItem>
            <MenuItem value="water">Water (m³)</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </TextField>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Previous Reading"
            type="number"
            value={previousReading}
            fullWidth
            disabled
            InputProps={{
              sx: { bgcolor: 'action.hover' }
            }}
          />
          <TextField
            label="Current Reading"
            type="number"
            value={currentReading}
            onChange={(e) => setCurrentReading(e.target.value)}
            fullWidth
            required
            autoFocus
          />
        </Box>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 2, border: '1px solid', borderColor: 'primary.100' }}>
          <Typography variant="subtitle2" color="primary.main" textTransform="uppercase" mb={1} fontWeight={700}>
            Computed Consumption
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">Total Units ({type === 'electricity' ? 'kWh' : 'm³'})</Typography>
            <Typography variant="body1" fontWeight={700}>{consumption.toLocaleString()}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">Rate Per Unit</Typography>
            <Typography variant="body1" fontWeight={500}>₱{ratePerUnit.toFixed(2)}</Typography>
          </Box>
          <Divider sx={{ my: 1, borderColor: 'primary.200' }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" fontWeight={700} color="primary.dark">Estimated Cost</Typography>
            <Typography variant="h6" fontWeight={800} color="primary.dark">₱{cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Typography>
          </Box>
        </Box>
      </Box>
    </FormDialog>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Button,
  Grid,
  useTheme,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Send as SendIcon, ArrowBack as BackIcon } from '@mui/icons-material';

import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../../application/context/AuthContext';
import { useNotification } from '../../../application/context/NotificationContext';
import { useTransfers } from '../../../application/hooks/useTransfers';
import { unitService } from '../../../infrastructure/services/UnitService';
import { propertyService } from '../../../infrastructure/services/PropertyService';
import type { Unit } from '../../../domain/entities/Unit';
import type { Property } from '../../../domain/entities/Property';

export default function RequestTransfer() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { requestTransfer, loading: isSubmitting } = useTransfers();

  const tenancy = user?.activeTenancy as any;
  const tenancyId = typeof tenancy === 'string' ? tenancy : tenancy?._id;
  const currentUnitId = tenancy?.unitId?._id || tenancy?.unitId || '';

  const [vacantUnits, setVacantUnits] = useState<Unit[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [targetUnitId, setTargetUnitId] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUnitsAndProperties = async () => {
      setIsLoading(true);
      try {
        const unitsData = await unitService.getUnits();
        const vacant = unitsData.filter(
          (u) => (u.status === 'vacant' || u.status === 'available') && u.id !== currentUnitId
        );
        setVacantUnits(vacant);

        const propIds = Array.from(new Set(unitsData.map((u) => u.propertyId)));
        const propPromises = propIds.map(async (propId) => {
          try {
            return await propertyService.getPropertyById(propId);
          } catch {
            return null;
          }
        });
        const resolvedProps = await Promise.all(propPromises);
        setProperties(resolvedProps.filter((p): p is Property => p !== null));
      } catch (error) {
        showNotification('Failed to load vacant units', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    if (tenancyId) {
      loadUnitsAndProperties();
    } else {
      setIsLoading(false);
    }
  }, [tenancyId, currentUnitId]);

  const getPropertyName = (propertyId: string) => {
    const prop = properties.find((p) => p.id === propertyId);
    return prop ? prop.name : 'Unknown Property';
  };

  const handleSubmit = async () => {
    if (!targetUnitId || !reason.trim() || !tenancyId) {
      showNotification('Please fill out all fields', 'warning');
      return;
    }

    try {
      await requestTransfer({
        fromUnitId: currentUnitId,
        toUnitId: targetUnitId,
        tenancyId,
        reason: reason.trim(),
      });
      showNotification('Transfer request submitted successfully!', 'success');
      navigate('/u/transfers');
    } catch (error) {
      showNotification('Failed to submit transfer request', 'error');
    }
  };

  if (!tenancyId) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <PageHeader title="Unit Transfer Request" />
        <Alert severity="info">You must have an active tenancy to request a unit transfer.</Alert>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/u/transfers')}
          sx={{ fontWeight: 600 }}
        >
          Back
        </Button>
        <PageHeader
          title="Request Unit Transfer"
          subtitle="Request to move to a different unit or room in the same or other property"
        />
      </Box>

      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Grid container spacing={3}>
            {/* Target Unit Dropdown */}
            <Grid size={12}>
              <TextField
                select
                label="Select Target Unit"
                placeholder="Choose unit to transfer to"
                fullWidth
                required
                value={targetUnitId}
                onChange={(e) => setTargetUnitId(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                helperText="Only vacant/available units are shown."
              >
                {vacantUnits.length === 0 ? (
                  <MenuItem disabled value="">
                    No vacant units available for transfer
                  </MenuItem>
                ) : (
                  vacantUnits.map((unit) => (
                    <MenuItem key={unit.id} value={unit.id}>
                      {getPropertyName(unit.propertyId)} — Unit {unit.unitIdentifier} ({unit.accommodationType === 'bedspace' ? 'Bedspace' : 'Whole Room'})
                    </MenuItem>
                  ))
                )}
              </TextField>
            </Grid>

            {/* Reason */}
            <Grid size={12}>
              <TextField
                label="Reason for Transfer"
                placeholder="Please describe why you wish to transfer (e.g. proximity to work, size, roommate issues, privacy)"
                fullWidth
                required
                multiline
                rows={5}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
          </Grid>

          {/* Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/u/transfers')}
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={handleSubmit}
              disabled={!targetUnitId || !reason.trim() || isSubmitting}
              sx={{ borderRadius: 2, fontWeight: 600, px: 4 }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, CircularProgress,
  TextField, Divider, Card, CardContent, Grid, MenuItem,
  Alert, Switch, FormControlLabel,
} from '@mui/material';
import {
  ArrowBack,
  Save as SaveIcon,
  Description as ContractIcon,
} from '@mui/icons-material';
import { useContractDetail } from '../../../../application/hooks/useContracts';

export default function ContractForm() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const { contract, loading, error, fetchContract, updateContract } = useContractDetail(contractId);

  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    lockInPeriod: 6,
    monthlyRent: 0,
    securityDeposit: 0,
    advancePayment: 0,
    utilityIncludedInRent: false,
    rateType: 'fixed' as 'fixed' | 'submetered',
    terms: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { fetchContract(); }, [fetchContract]);

  // Populate form from contract
  useEffect(() => {
    if (!contract) return;
    setFormData({
      startDate: contract.startDate ? new Date(contract.startDate).toISOString().split('T')[0] : '',
      endDate: contract.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : '',
      lockInPeriod: contract.lockInPeriod || 6,
      monthlyRent: contract.monthlyRent || 0,
      securityDeposit: contract.securityDeposit || 0,
      advancePayment: contract.advancePayment || 0,
      utilityIncludedInRent: contract.utilityIncludedInRent || false,
      rateType: contract.rateType || 'fixed',
      terms: contract.terms || '',
    });
  }, [contract]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateContract(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save contract:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  if (error || !contract) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/hub/contracts')} sx={{ mb: 2 }}>Back to Contracts</Button>
        <Typography color="error">{error || 'Contract not found'}</Typography>
      </Box>
    );
  }

  if (contract.status !== 'draft') {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(`/hub/contracts/${contractId}`)} sx={{ mb: 2 }}>Back to Contract</Button>
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          This contract can no longer be edited. Only draft contracts can be modified.
        </Alert>
      </Box>
    );
  }

  const app = contract.application as any;
  const tenantName = app?.personalDetails?.fullName || app?.user?.name || 'Unknown Tenant';

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate(`/hub/contracts/${contractId}`)}
        sx={{ mb: 3, fontWeight: 600 }}>
        Back to Contract
      </Button>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 48, height: 48, borderRadius: 3,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
            }}
          >
            <ContractIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={800}>Edit Contract</Typography>
            <Typography variant="body1" color="text.secondary">
              Editing draft lease agreement for <strong>{tenantName}</strong>
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {saved && (
            <Typography variant="caption" color="success.main" fontWeight={600}>✓ Saved</Typography>
          )}
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
            sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' }, fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
          >
            Save Changes
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Lease Dates */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ borderRadius: 4 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 3 }}>
                Lease Period
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  fullWidth label="Start Date" type="date" value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  fullWidth label="End Date" type="date" value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  fullWidth label="Lock-in Period (months)" type="number" value={formData.lockInPeriod}
                  onChange={(e) => handleChange('lockInPeriod', parseInt(e.target.value) || 0)}
                  slotProps={{ input: { inputProps: { min: 0, max: 36 } } }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Financial Terms */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ borderRadius: 4 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 3 }}>
                Financial Terms
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  fullWidth label="Monthly Rent (₱)" type="number" value={formData.monthlyRent}
                  onChange={(e) => handleChange('monthlyRent', parseFloat(e.target.value) || 0)}
                  slotProps={{ input: { inputProps: { min: 0 } } }}
                />
                <TextField
                  fullWidth label="Security Deposit (₱)" type="number" value={formData.securityDeposit}
                  onChange={(e) => handleChange('securityDeposit', parseFloat(e.target.value) || 0)}
                  slotProps={{ input: { inputProps: { min: 0 } } }}
                />
                <TextField
                  fullWidth label="Advance Payment (₱)" type="number" value={formData.advancePayment}
                  onChange={(e) => handleChange('advancePayment', parseFloat(e.target.value) || 0)}
                  slotProps={{ input: { inputProps: { min: 0 } } }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Utility Configuration */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ borderRadius: 4 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 3 }}>
                Utility Configuration
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.utilityIncludedInRent}
                      onChange={(e) => handleChange('utilityIncludedInRent', e.target.checked)}
                    />
                  }
                  label="Utilities included in rent"
                />
                <TextField
                  select fullWidth label="Rate Type" value={formData.rateType}
                  onChange={(e) => handleChange('rateType', e.target.value)}
                >
                  <MenuItem value="fixed">Fixed Rate</MenuItem>
                  <MenuItem value="submetered">Submetered</MenuItem>
                </TextField>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Custom Terms */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ borderRadius: 4 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 3 }}>
                Custom Terms & Conditions
              </Typography>
              <TextField
                fullWidth multiline minRows={6} maxRows={12}
                placeholder="Enter any additional terms, rules, or conditions for this lease agreement..."
                value={formData.terms}
                onChange={(e) => handleChange('terms', e.target.value)}
                variant="outlined"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

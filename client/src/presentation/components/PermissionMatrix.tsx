import React from 'react';
import { Box, Typography, Switch, FormControlLabel, Grid, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';

export const PERMISSION_KEYS = [
  'dashboard', 'properties', 'units', 'tenants', 'pipeline', 'bookings',
  'billing', 'contracts', 'utilities', 'financials', 'inventory', 'maintenance',
  'documents', 'reports', 'security', 'team'
] as const;

export type PermissionKey = typeof PERMISSION_KEYS[number];

const PRESETS: Record<string, PermissionKey[]> = {
  'basic_staff': ['dashboard', 'units', 'bookings'],
  'manager': ['dashboard', 'properties', 'units', 'tenants', 'pipeline', 'maintenance'],
  'accountant': ['dashboard', 'billing', 'financials', 'reports'],
  'admin': [...PERMISSION_KEYS]
};

interface PermissionMatrixProps {
  selectedPermissions: PermissionKey[];
  onChange: (permissions: PermissionKey[]) => void;
}

export default function PermissionMatrix({ selectedPermissions, onChange }: PermissionMatrixProps) {
  const [preset, setPreset] = React.useState<string>('custom');

  const handleToggle = (key: PermissionKey) => {
    setPreset('custom');
    if (selectedPermissions.includes(key)) {
      onChange(selectedPermissions.filter(p => p !== key));
    } else {
      onChange([...selectedPermissions, key]);
    }
  };

  const handlePresetChange = (e: SelectChangeEvent) => {
    const value = e.target.value;
    setPreset(value);
    if (value !== 'custom' && PRESETS[value]) {
      onChange(PRESETS[value]);
    } else if (value === 'custom') {
      onChange([]);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Permission Preset</InputLabel>
          <Select value={preset} label="Permission Preset" onChange={handlePresetChange}>
            <MenuItem value="custom">Custom</MenuItem>
            <MenuItem value="basic_staff">Basic Staff (View Only)</MenuItem>
            <MenuItem value="manager">Property Manager</MenuItem>
            <MenuItem value="accountant">Accountant / Finance</MenuItem>
            <MenuItem value="admin">Full Admin Access</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
        Specific Permissions
      </Typography>

      <Grid container spacing={1}>
        {PERMISSION_KEYS.map(key => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={key}>
            <FormControlLabel
              control={
                <Switch
                  checked={selectedPermissions.includes(key)}
                  onChange={() => handleToggle(key)}
                  size="small"
                  color="primary"
                />
              }
              label={<Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{key}</Typography>}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

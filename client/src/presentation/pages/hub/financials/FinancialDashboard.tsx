import { useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  AccountBalanceWallet,
  ElectricBolt,
  WarningAmber,
  Replay
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import PageHeader from '../../../components/PageHeader';
import StatCard from '../../../components/StatCard';
import { useFinancialDashboard } from '../../../../application/hooks/useFinancialDashboard';
import type { FinancialPeriod } from '../../../../application/hooks/useFinancialDashboard';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);

const periodOptions: Array<{ value: FinancialPeriod; label: string }> = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'year_to_date', label: 'Year to Date' },
  { value: 'this_year', label: 'This Year' }
];

export default function FinancialDashboard() {
  const {
    period,
    setPeriod,
    propertyId,
    setPropertyId,
    summary,
    monthlyTrend,
    byProperty,
    loading,
    error,
    refresh
  } = useFinancialDashboard();

  const propertyOptions = useMemo(() => {
    const rows = byProperty?.data || [];
    return rows.map((row) => ({ id: row.propertyId, name: row.propertyName }));
  }, [byProperty]);

  const monthlyData = monthlyTrend?.trend || [];
  const propertyData = byProperty?.data || [];

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Financial Dashboard"
        subtitle="Track rent, utilities, penalties, and net income across your properties."
        action={
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel id="financial-period-label">Period</InputLabel>
              <Select
                labelId="financial-period-label"
                value={period}
                label="Period"
                onChange={(event: SelectChangeEvent) => setPeriod(event.target.value as FinancialPeriod)}
              >
                {periodOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="financial-property-label">Property</InputLabel>
              <Select
                labelId="financial-property-label"
                value={propertyId}
                label="Property"
                onChange={(event: SelectChangeEvent) => setPropertyId(event.target.value)}
              >
                <MenuItem value="all">All Properties</MenuItem>
                {propertyOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>{option.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small">
              <MenuItem
                onClick={refresh}
                sx={{ borderRadius: 1.5, display: 'flex', gap: 1, px: 2, py: 1 }}
              >
                <Replay fontSize="small" />
                Refresh
              </MenuItem>
            </FormControl>
          </Box>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
              <StatCard
                title="Total Rent"
                value={formatCurrency(summary?.rentCollected || 0)}
                icon={<AccountBalanceWallet />}
                color="primary"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
              <StatCard
                title="Utilities"
                value={formatCurrency(summary?.utilitiesCollected || 0)}
                icon={<ElectricBolt />}
                color="info"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
              <StatCard
                title="Penalties"
                value={formatCurrency(summary?.penaltiesCollected || 0)}
                icon={<WarningAmber />}
                color="warning"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
              <StatCard
                title="Refunds"
                value={formatCurrency(summary?.refunds || 0)}
                icon={<Replay />}
                color="secondary"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
              <StatCard
                title="Net Income"
                value={formatCurrency(summary?.netIncome || 0)}
                icon={<AccountBalanceWallet />}
                color="success"
              />
            </Grid>
          </Grid>

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    Monthly Revenue Trend
                  </Typography>
                  <Box sx={{ height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis tickFormatter={(value) => `P${Math.round(value / 1000)}k`} />
                        <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                        <Legend />
                        <Line type="monotone" dataKey="netIncome" name="Net Income" stroke="#2e7d32" strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="rentCollected" name="Rent" stroke="#1976d2" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="utilitiesCollected" name="Utilities" stroke="#0288d1" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, lg: 5 }}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    Income by Property
                  </Typography>
                  <Box sx={{ height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={propertyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="propertyName" hide />
                        <YAxis tickFormatter={(value) => `P${Math.round(value / 1000)}k`} />
                        <Tooltip
                          formatter={(value: any) => formatCurrency(Number(value))}
                          labelFormatter={(_, payload: any) => payload?.[0]?.payload?.propertyName || 'Property'}
                        />
                        <Legend />
                        <Bar dataKey="netIncome" name="Net Income" fill="#2e7d32" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}

import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Alert,
  AlertTitle,
  useTheme,
  Button
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { CheckoutForecast as ForecastModel } from '../../../../domain/models/Report';
import { format } from 'date-fns';

interface CheckoutForecastProps {
  forecast: ForecastModel;
}

export default function CheckoutForecast({ forecast }: CheckoutForecastProps) {
  const theme = useTheme();

  // Calculate total expiring and total revenue loss for the next 6 months
  const totalExpiring = forecast.monthlyForecast.reduce((acc, curr) => acc + curr.expiringCount, 0);
  const totalRevenueLoss = forecast.monthlyForecast.reduce((acc, curr) => acc + curr.revenueLoss, 0);

  return (
    <Box sx={{ mt: 3 }}>
      {forecast.peakMonth && (
        <Alert severity="warning" sx={{ mb: 4, borderRadius: 2 }}>
          <AlertTitle>High Vacancy Expected</AlertTitle>
          A peak in move-outs is forecasted for <strong>{forecast.peakMonth}</strong>. Consider starting marketing campaigns and auto-renewal offers early to minimize revenue loss.
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography color="textSecondary" variant="subtitle2" gutterBottom>
                Expiring Contracts (Next 6 Mo)
              </Typography>
              <Typography variant="h4" color="warning.main">
                {totalExpiring}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography color="textSecondary" variant="subtitle2" gutterBottom>
                Peak Move-Out Month
              </Typography>
              <Typography variant="h4">
                {forecast.peakMonth || 'None'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography color="textSecondary" variant="subtitle2" gutterBottom>
                Potential Revenue Loss
              </Typography>
              <Typography variant="h4" color="error.main">
                ₱{totalRevenueLoss.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        {/* Forecast Bar Chart */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card elevation={2} sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Move-Out Forecast (Next 6 Months)
              </Typography>
              <Box sx={{ height: 350, mt: 3 }}>
                {forecast.monthlyForecast.length === 0 ? (
                  <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                    <Typography color="textSecondary">No data available</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={forecast.monthlyForecast}
                      margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" />
                      <YAxis allowDecimals={false} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                        formatter={(value: any, name: any) => {
                          if (name === 'revenueLoss') return [`₱${Number(value).toLocaleString()}`, 'Revenue Loss'];
                          return [value, 'Expiring Contracts'];
                        }}
                      />
                      <Bar 
                        dataKey="expiringCount" 
                        fill={theme.palette.warning.main} 
                        radius={[4, 4, 0, 0]} 
                        name="Expiring Contracts"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Expiring Contracts Table */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card elevation={2} sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Upcoming Expirations
                </Typography>
                <Button variant="outlined" size="small" color="primary">
                  Send Auto-Renewal Offers
                </Button>
              </Box>
              <TableContainer component={Paper} elevation={0} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'background.default' }}>
                    <TableRow>
                      <TableCell>Tenant</TableCell>
                      <TableCell>Property / Unit</TableCell>
                      <TableCell>End Date</TableCell>
                      <TableCell align="right">Rent</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {forecast.expiringContracts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                          No expiring contracts in the next 6 months.
                        </TableCell>
                      </TableRow>
                    ) : (
                      forecast.expiringContracts.slice(0, 10).map((contract) => (
                        <TableRow key={contract.contractId} hover>
                          <TableCell sx={{ fontWeight: 500 }}>{contract.tenantName || 'N/A'}</TableCell>
                          <TableCell>
                            <Typography variant="body2">{contract.propertyName}</Typography>
                            <Typography variant="caption" color="textSecondary">Unit {contract.unitIdentifier}</Typography>
                          </TableCell>
                          <TableCell>
                            {format(new Date(contract.endDate), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell align="right">
                            ₱{contract.monthlyRent?.toLocaleString() || 0}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {forecast.expiringContracts.length > 10 && (
                <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
                  Showing first 10 expiring contracts
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

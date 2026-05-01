import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Grid2 as Grid, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  useTheme,
  LinearProgress
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { OccupancyStats } from '../../../../domain/models/Report';

interface OccupancyReportProps {
  stats: OccupancyStats;
}

export default function OccupancyReport({ stats }: OccupancyReportProps) {
  const theme = useTheme();

  const chartData = [
    { name: 'Occupied', value: stats.occupiedUnits, color: theme.palette.success.main },
    { name: 'Vacant', value: stats.vacantUnits, color: theme.palette.error.main },
    { name: 'Reserved', value: stats.reservedUnits, color: theme.palette.info.main },
    { name: 'Maintenance', value: stats.maintenanceUnits, color: theme.palette.warning.main },
  ].filter(item => item.value > 0);

  return (
    <Box sx={{ mt: 3 }}>
      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography color="textSecondary" variant="subtitle2" gutterBottom>
                Total Units
              </Typography>
              <Typography variant="h4">{stats.totalUnits}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography color="textSecondary" variant="subtitle2" gutterBottom>
                Occupied
              </Typography>
              <Typography variant="h4" color="success.main">{stats.occupiedUnits}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography color="textSecondary" variant="subtitle2" gutterBottom>
                Vacant
              </Typography>
              <Typography variant="h4" color="error.main">{stats.vacantUnits}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography color="textSecondary" variant="subtitle2" gutterBottom>
                Occupancy Rate
              </Typography>
              <Typography variant="h4" color="primary.main">
                {stats.occupancyRate.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        {/* Donut Chart */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card elevation={2} sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Overall Distribution
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                {stats.totalUnits === 0 ? (
                  <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                    <Typography color="textSecondary">No unit data available</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Property Breakdown Table */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card elevation={2} sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Property Breakdown
              </Typography>
              <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'background.default' }}>
                    <TableRow>
                      <TableCell>Property</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="right">Occ.</TableCell>
                      <TableCell align="right">Vac.</TableCell>
                      <TableCell align="right">Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.propertyBreakdown.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                          No properties found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      stats.propertyBreakdown.map((prop) => (
                        <TableRow key={prop.propertyId} hover>
                          <TableCell sx={{ fontWeight: 500 }}>{prop.propertyName}</TableCell>
                          <TableCell align="right">{prop.totalUnits}</TableCell>
                          <TableCell align="right" sx={{ color: 'success.main' }}>
                            {prop.occupiedUnits}
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'error.main' }}>
                            {prop.vacantUnits}
                          </TableCell>
                          <TableCell align="right" sx={{ width: 120 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box sx={{ width: '100%', mr: 1 }}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={prop.occupancyRate} 
                                  color={
                                    prop.occupancyRate > 80 ? 'success' :
                                    prop.occupancyRate > 50 ? 'warning' : 'error'
                                  }
                                />
                              </Box>
                              <Box sx={{ minWidth: 35 }}>
                                <Typography variant="body2" color="text.secondary">
                                  {Math.round(prop.occupancyRate)}%
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

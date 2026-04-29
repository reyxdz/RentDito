import { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Typography, 
  MenuItem, 
  TextField, 
  Divider, 
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Chip
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Add as AddIcon, WarningAmber, ErrorOutline } from '@mui/icons-material';
import { 
  BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

import PageHeader from '../../../components/PageHeader';
import MeterReadingForm from './MeterReadingForm';
import { useUtilities } from '../../../../application/hooks/useUtilities';

const EXPENSE_COLORS = {
  electricity: '#f59e0b', // Amber
  water: '#3b82f6', // Blue
  internet: '#10b981', // Emerald
  other: '#6b7280' // Gray
};


export default function UtilityDashboard() {
  const { metrics, loading, fetchMetrics, recordReading } = useUtilities();
  
  const [propertyFilter, setPropertyFilter] = useState('All');
  const [periodFilter, setPeriodFilter] = useState('Last 6 Months');
  const [readingFormOpen, setReadingFormOpen] = useState(false);

  useEffect(() => {
    fetchMetrics({ propertyId: propertyFilter === 'All' ? undefined : propertyFilter });
  }, [fetchMetrics, propertyFilter, periodFilter]);

  if (loading && !metrics) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  }

  // Graceful fallback for empty metrics
  if (!metrics) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Failed to load utility data.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 }, pb: 10 }}>
      <PageHeader
        title="Utility Dashboard"
        subtitle="Monitor property consumption and manage expenses efficiently."
        action={
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setReadingFormOpen(true)}
          >
            Record Reading
          </Button>
        }
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <TextField
          select
          label="Property"
          size="small"
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="All">All Properties</MenuItem>
          <MenuItem value="p1">White Dorm</MenuItem>
          <MenuItem value="p2">Uytengso</MenuItem>
        </TextField>

        <TextField
          select
          label="Period"
          size="small"
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="Last 3 Months">Last 3 Months</MenuItem>
          <MenuItem value="Last 6 Months">Last 6 Months</MenuItem>
          <MenuItem value="This Year">This Year</MenuItem>
        </TextField>
      </Box>

      {/* Primary Analytics Section */}
      <Grid container spacing={3}>
        
        {/* Left Col - Charts */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>Monthly Consumption Trends</Typography>
              <Box sx={{ height: 320, mt: 3 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.monthlyConsumption} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: 20 }} />
                    <Bar dataKey="electricity" name="Electricity (kWh)" fill={EXPENSE_COLORS.electricity} radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="water" name="Water (m³)" fill={EXPENSE_COLORS.water} radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>

          {/* Overconsumption Alerts */}
          {metrics.overconsumptionAlerts.length > 0 && (
            <Box mb={3}>
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Alerts <Chip size="small" label={metrics.overconsumptionAlerts.length} color="error" />
              </Typography>
              <Grid container spacing={2}>
                {metrics.overconsumptionAlerts.map((alert, idx) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={idx}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        borderRadius: 2, 
                        bgcolor: alert.severity === 'critical' ? 'error.50' : 'warning.50',
                        borderColor: alert.severity === 'critical' ? 'error.200' : 'warning.200'
                      }}
                    >
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                          {alert.severity === 'critical' ? 
                            <ErrorOutline color="error" /> : 
                            <WarningAmber color="warning" />
                          }
                          <Box>
                            <Typography variant="subtitle2" fontWeight={700} color={alert.severity === 'critical' ? 'error.dark' : 'warning.dark'}>
                              {alert.unitIdentifier} - High {alert.type}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Used {alert.consumption} {alert.type === 'electricity' ? 'kWh' : 'm³'} (Threshold: {alert.threshold})
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Grid>

        {/* Right Col - Summaries */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>Expense Distribution</Typography>
              <Box sx={{ height: 220, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.expenseSummary}
                      dataKey="value"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                    >
                      {metrics.expenseSummary.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[entry.type as keyof typeof EXPENSE_COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₱${Number(value).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ mt: 2 }}>
                {metrics.expenseSummary.map((item, idx) => (
                  <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, px: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ w: 10, h: 10, bgcolor: EXPENSE_COLORS[item.type as keyof typeof EXPENSE_COLORS], borderRadius: '50%', width: 12, height: 12 }} />
                      <Typography variant="body2" textTransform="capitalize">{item.type}</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={600}>₱{item.value.toLocaleString()}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ pb: 1 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>Highest Usage Rooms</Typography>
              <List disablePadding>
                {metrics.highestUsageRooms.map((room, idx) => (
                  <Box key={room.unitId}>
                    <ListItem sx={{ px: 0, py: 1.5 }}>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: idx === 0 ? 'error.main' : 'warning.main', fontSize: 12, fontWeight: 700 }}>
                          #{idx + 1}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Typography variant="subtitle2" fontWeight={600}>
                            {room.unitIdentifier}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" sx={{ color: room.percentageOffset > 0 ? 'error.main' : 'success.main' }}>
                            {room.percentageOffset > 0 ? '+' : ''}{room.percentageOffset}% vs avg
                          </Typography>
                        }
                      />
                      <Typography variant="body2" fontWeight={700}>
                        ₱{room.cost.toLocaleString()}
                      </Typography>
                    </ListItem>
                    {idx < metrics.highestUsageRooms.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <MeterReadingForm
        open={readingFormOpen}
        onClose={() => setReadingFormOpen(false)}
        onSubmit={async (data) => {
          await recordReading(data);
          fetchMetrics(); // refresh data
        }}
      />
    </Box>
  );
}

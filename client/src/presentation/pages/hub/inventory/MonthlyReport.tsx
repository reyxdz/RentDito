import { useEffect } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress } from '@mui/material';
import Grid from '@mui/material/Grid';
import { 
  BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { useInventory } from '../../../../application/hooks/useInventory';

const STATUS_COLORS: Record<string, string> = {
  Available: '#10b981', // green
  Issued: '#3b82f6', // blue
  Maintenance: '#f59e0b', // amber
  Retired: '#ef4444' // red
};

export default function MonthlyReport() {
  const { metrics, loading, fetchMetrics } = useInventory();

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (loading || !metrics) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>Active Issued Items</Typography>
              <Typography variant="h4" fontWeight={700} color="primary.main">{metrics.activeIssued}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>Lost / Damaged Records</Typography>
              <Typography variant="h4" fontWeight={700} color="error.main">{metrics.lostDamaged}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 12, md: 6 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'warning.50', borderColor: 'warning.200' }}>
            <CardContent>
              <Typography variant="body2" color="warning.dark" gutterBottom fontWeight={600}>Most Damaged Item Type</Typography>
              {metrics.mostDamagedItem ? (
                <Box>
                  <Typography variant="h5" fontWeight={700} color="warning.dark">{metrics.mostDamagedItem.itemName}</Typography>
                  <Typography variant="caption" color="warning.dark">Reported {metrics.mostDamagedItem.damageCount} times this period.</Typography>
                </Box>
              ) : (
                <Typography variant="h6" color="text.secondary">No damage recorded.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>Status Distribution</Typography>
              <Box sx={{ height: 250, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.statusDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                    >
                      {metrics.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#8884d8'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>Asset Depreciation Analysis</Typography>
              <Box sx={{ height: 250, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.depreciation} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="itemName" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend wrapperStyle={{ paddingTop: 10 }} />
                    <Bar dataKey="cost" name="Purchase Cost" fill="#cbd5e1" radius={[2, 2, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="currentEstimatedValue" name="Current Est. Value" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

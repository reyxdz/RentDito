import { Box, Typography, Grid, Card, Button } from '@mui/material';
import { HomeWork, AccountBalanceWallet, DateRange, Person } from '@mui/icons-material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const REVENUE_DATA = [
  { name: 'Jan', revenue: 45000 }, { name: 'Feb', revenue: 52000 },
  { name: 'Mar', revenue: 48000 }, { name: 'Apr', revenue: 61000 },
  { name: 'May', revenue: 59000 }, { name: 'Jun', revenue: 67000 },
];

const OCCUPANCY_DATA = [
  { name: 'Prop A', occupied: 8, vacant: 2 },
  { name: 'Prop B', occupied: 15, vacant: 0 },
  { name: 'Prop C', occupied: 4, vacant: 6 },
];

export default function LandlordOverview() {
  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 1, letterSpacing: -0.5 }}>
            Landlord Overview
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome back! Here is a summary of your property portfolio.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" sx={{ borderRadius: 2, fontWeight: 600 }}>
          Add New Property
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Metric Cards */}
        {[
          { label: 'Total Properties', value: '3', trend: '+1 this year', icon: <HomeWork />, color: 'primary' },
          { label: 'Total Units', value: '35', trend: '27 currently occupied', icon: <DateRange />, color: 'secondary' },
          { label: 'Monthly Revenue', value: '₱67,000', trend: '+12% vs last month', icon: <AccountBalanceWallet />, color: 'success' },
          { label: 'Active Leases', value: '27', trend: '3 renewals pending', icon: <Person />, color: 'info' }
        ].map((metric) => (
          <Grid key={metric.label} size={{ xs: 12, sm: 6, md: 3 }}>
             <Card sx={{ p: 3, borderRadius: 4, boxShadow: '0 4px 20px -10px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                   <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                     {metric.label}
                   </Typography>
                   <Box sx={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: metric.color + '.light', color: metric.color + '.main' }}>
                     {metric.icon}
                   </Box>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, mt: 'auto', letterSpacing: -1 }}>
                   {metric.value}
                </Typography>
                <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
                   {metric.trend}
                </Typography>
             </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ p: 3, borderRadius: 4, boxShadow: '0 4px 20px -10px rgba(0,0,0,0.05)' }}>
             <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Revenue Timeline</Typography>
             <Box sx={{ height: 300, width: '100%' }}>
               <ResponsiveContainer>
                 <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                   <defs>
                     <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#5a31e8" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#5a31e8" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                   <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dx={-10} />
                   <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.1)' }} />
                   <Area type="monotone" dataKey="revenue" stroke="#5a31e8" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                 </AreaChart>
               </ResponsiveContainer>
             </Box>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ p: 3, borderRadius: 4, boxShadow: '0 4px 20px -10px rgba(0,0,0,0.05)', height: '100%' }}>
             <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Property Occupancy</Typography>
             <Box sx={{ height: 300, width: '100%' }}>
               <ResponsiveContainer>
                  <BarChart data={OCCUPANCY_DATA} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                    <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="occupied" name="Occupied Units" stackId="a" fill="#5a31e8" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="vacant" name="Vacant Units" stackId="a" fill="#e0e0e0" radius={[4, 4, 0, 0]} />
                  </BarChart>
               </ResponsiveContainer>
             </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

import { useState } from 'react';
import { 
  Box, Typography, Grid, Card, CardContent, IconButton, 
  Button, Menu, MenuItem, useTheme 
} from '@mui/material';
import { 
  MoreVert, TrendingUp, Group, HomeWork, AccountBalanceWallet 
} from '@mui/icons-material';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

const REVENUE_DATA = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 5000 },
  { name: 'Apr', value: 4500 },
  { name: 'May', value: 6000 },
  { name: 'Jun', value: 6800 },
  { name: 'Jul', value: 8500 },
];

const USER_DATA = [
  { name: 'Mon', users: 240 },
  { name: 'Tue', users: 1390 },
  { name: 'Wed', users: 980 },
  { name: 'Thu', users: 3908 },
  { name: 'Fri', users: 4800 },
  { name: 'Sat', users: 3800 },
  { name: 'Sun', users: 4300 },
];

export default function Overview() {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const kpis = [
    { title: 'Total Revenue', value: '₱2.4M', increment: '+12.5%', icon: <AccountBalanceWallet color="primary" /> },
    { title: 'Active Users', value: '14,233', increment: '+5.2%', icon: <Group color="secondary" /> },
    { title: 'Total Properties', value: '3,842', increment: '+1.4%', icon: <HomeWork color="success" /> },
    { title: 'Booking Rate', value: '64%', increment: '+8.1%', icon: <TrendingUp color="info" /> },
  ];

  const primaryGradient = theme.palette.mode === 'light' ? 'url(#colorValue)' : 'url(#colorValueDark)';

  return (
    <Box sx={{ pb: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
           <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Overview Dashboard</Typography>
           <Typography variant="body2" color="text.secondary">Welcome back! Here's what's happening on RentDito today.</Typography>
        </Box>
        <Button variant="contained" color="primary">Generate Report</Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpis.map((kpi, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {kpi.title}
                  </Typography>
                  <Box sx={{ 
                     p: 1, borderRadius: 2, 
                     bgcolor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)' 
                  }}>
                    {kpi.icon}
                  </Box>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>{kpi.value}</Typography>
                <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                  {kpi.increment} <Typography component="span" variant="caption" color="text.secondary">vs last month</Typography>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Main Chart */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Revenue Growth</Typography>
                <IconButton onClick={handleClick}><MoreVert /></IconButton>
                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
                  <MenuItem onClick={handleClose}>View Details</MenuItem>
                  <MenuItem onClick={handleClose}>Export CSV</MenuItem>
                </Menu>
              </Box>
              
              <Box sx={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorValueDark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.primary.light} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={theme.palette.primary.light} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} 
                    />
                    <Tooltip 
                       contentStyle={{ 
                         backgroundColor: theme.palette.background.paper,
                         borderRadius: 12,
                         border: '1px solid ' + theme.palette.divider,
                         boxShadow: theme.shadows[4]
                       }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={theme.palette.primary.main} 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill={primaryGradient} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Secondary Chart */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Active User Trends</Typography>
              <Box sx={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={USER_DATA} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}  
                    />
                    <Tooltip 
                       cursor={{ fill: theme.palette.action.hover }}
                       contentStyle={{ 
                         backgroundColor: theme.palette.background.paper,
                         borderRadius: 12,
                         border: '1px solid ' + theme.palette.divider,
                         boxShadow: theme.shadows[4]
                       }} 
                    />
                    <Bar 
                      dataKey="users" 
                      fill={theme.palette.secondary.main} 
                      radius={[4, 4, 0, 0]} 
                      barSize={20}
                    />
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

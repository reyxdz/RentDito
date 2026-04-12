import React from 'react';
import { Box, Typography, Grid, Paper } from '@mui/material';

const Overview = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Welcome to your Hub Dashboard!
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Here's what's happening with your properties today.
      </Typography>

      <Grid container spacing={3}>
        {/* Placeholder Stat Cards */}
        {['Total Properties', 'Active Units', 'Total Tenants', 'Pending Inquiries'].map((label, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
              <Typography color="text.secondary" gutterBottom>
                {label}
              </Typography>
              <Typography component="p" variant="h4">
                0
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Overview;

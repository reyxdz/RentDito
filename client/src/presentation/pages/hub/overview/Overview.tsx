import { useEffect } from 'react';
import { Box, Typography, Grid, Paper, CircularProgress } from '@mui/material';
import {
  HomeWorkOutlined,
  MeetingRoomOutlined,
  PeopleOutlined,
  CheckCircleOutlined,
} from '@mui/icons-material';
import { useProperties } from '../../../../application/hooks/useProperties';
import { useUnits } from '../../../../application/hooks/useUnits';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

function StatCard({ label, value, icon, color, loading }: StatCardProps) {
  return (
    <Paper
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        height: 160,
        borderRadius: 3,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: color,
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
          {label}
        </Typography>
        <Box sx={{ color, opacity: 0.7 }}>
          {icon}
        </Box>
      </Box>
      {loading ? (
        <CircularProgress size={28} sx={{ mt: 1 }} />
      ) : (
        <Typography variant="h3" sx={{ fontWeight: 800, mt: 'auto' }}>
          {value}
        </Typography>
      )}
    </Paper>
  );
}

const Overview = () => {
  const { properties, loading: propsLoading } = useProperties();
  const { units, fetchUnits, loading: unitsLoading } = useUnits();

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const totalProperties = properties.length;
  const activeProperties = properties.filter(p => p.status === 'Active').length;
  const totalUnits = units.length;
  const vacantUnits = units.filter(u => u.status === 'vacant').length;
  const occupiedUnits = units.filter(u => u.status === 'occupied').length;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Welcome to your Hub Dashboard!
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Here's what's happening with your properties today.
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Total Properties"
            value={`${activeProperties} / ${totalProperties}`}
            icon={<HomeWorkOutlined sx={{ fontSize: 28 }} />}
            color="#6366f1"
            loading={propsLoading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Total Units"
            value={totalUnits}
            icon={<MeetingRoomOutlined sx={{ fontSize: 28 }} />}
            color="#10b981"
            loading={unitsLoading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Vacant Units"
            value={vacantUnits}
            icon={<CheckCircleOutlined sx={{ fontSize: 28 }} />}
            color="#f59e0b"
            loading={unitsLoading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Occupied Units"
            value={occupiedUnits}
            icon={<PeopleOutlined sx={{ fontSize: 28 }} />}
            color="#ef4444"
            loading={unitsLoading}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Overview;

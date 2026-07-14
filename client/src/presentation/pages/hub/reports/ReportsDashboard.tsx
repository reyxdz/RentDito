import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Tabs, 
  Tab, 
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  PieChart as PieChartIcon,
  AttachMoney as MoneyIcon,
  TrendingDown as ForecastIcon,
  HomeWork as VacancyIcon
} from '@mui/icons-material';

import { ReportService } from '../../../../application/services/ReportService';
import type { OccupancyStats, CheckoutForecast as ForecastModel, VacancyForecast as VacancyModel } from '../../../../domain/models/Report';

import OccupancyReport from './OccupancyReport';
import CheckoutForecast from './CheckoutForecast';
import VacancyForecast from './VacancyForecast';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `reports-tab-${index}`,
    'aria-controls': `reports-tabpanel-${index}`,
  };
}

export default function ReportsDashboard() {
  const [tabValue, setTabValue] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [occupancyData, setOccupancyData] = useState<OccupancyStats | null>(null);
  const [forecastData, setForecastData] = useState<ForecastModel | null>(null);
  const [vacancyData, setVacancyData] = useState<VacancyModel | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [occStats, checkoutFC, vacancyFC] = await Promise.all([
        ReportService.getOccupancyStats(),
        ReportService.getCheckoutForecast(),
        ReportService.getVacancyForecast()
      ]);
      setOccupancyData(occStats);
      setForecastData(checkoutFC);
      setVacancyData(vacancyFC);
    } catch (err: any) {
      console.error('Error fetching reports data:', err);
      setError('Failed to load report data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Reports & Analytics
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Insights and forecasts for your property portfolio.
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ width: '100%', borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 2 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="reports tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<PieChartIcon />} iconPosition="start" label="Occupancy" {...a11yProps(0)} />
            <Tab icon={<MoneyIcon />} iconPosition="start" label="Financial (Soon)" {...a11yProps(1)} />
            <Tab icon={<ForecastIcon />} iconPosition="start" label="Checkout Forecast" {...a11yProps(2)} />
            <Tab icon={<VacancyIcon />} iconPosition="start" label="Vacancy Forecast" {...a11yProps(3)} />
          </Tabs>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 4 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        ) : (
          <Box sx={{ px: { xs: 2, sm: 3 }, pb: 3 }}>
            <CustomTabPanel value={tabValue} index={0}>
              {occupancyData && <OccupancyReport stats={occupancyData} />}
            </CustomTabPanel>
            
            <CustomTabPanel value={tabValue} index={1}>
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="textSecondary">
                  Financial reporting is coming soon.
                </Typography>
              </Box>
            </CustomTabPanel>
            
            <CustomTabPanel value={tabValue} index={2}>
              {forecastData && <CheckoutForecast forecast={forecastData} />}
            </CustomTabPanel>
            
            <CustomTabPanel value={tabValue} index={3}>
              {vacancyData && <VacancyForecast forecast={vacancyData} />}
            </CustomTabPanel>
          </Box>
        )}
      </Paper>
    </Container>
  );
}

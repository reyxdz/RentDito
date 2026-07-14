import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  useTheme,
  alpha,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  HomeWork as VacancyIcon,
  TrendingUp as TrendIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import type { VacancyForecast as VacancyForecastType } from '../../../../domain/models/Report';

interface VacancyForecastProps {
  forecast: VacancyForecastType;
}

export default function VacancyForecast({ forecast }: VacancyForecastProps) {
  const theme = useTheme();

  const highVacancyAlert = forecast.predictedVacancyRate > 30;

  return (
    <Box>
      {/* Summary Stat Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              height: '100%',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                  }}
                >
                  <VacancyIcon fontSize="small" />
                </Box>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Total Units
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={800}>
                {forecast.totalUnits}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              height: '100%',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                    color: theme.palette.warning.main,
                  }}
                >
                  <VacancyIcon fontSize="small" />
                </Box>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Currently Vacant
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={800}>
                {forecast.currentVacant}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {forecast.currentVacancyRate.toFixed(1)}% vacancy rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${forecast.predictedVacancyRate > 30 ? theme.palette.error.main : theme.palette.divider}`,
              height: '100%',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    color: theme.palette.error.main,
                  }}
                >
                  <TrendIcon fontSize="small" />
                </Box>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Predicted Vacant (3mo)
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={800} color={forecast.predictedVacancyRate > 30 ? 'error.main' : 'text.primary'}>
                {forecast.predictedVacant}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {forecast.predictedVacancyRate.toFixed(1)}% predicted rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              height: '100%',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    color: theme.palette.info.main,
                  }}
                >
                  <TrendIcon fontSize="small" />
                </Box>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Vacancy Change
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={800} color={forecast.predictedVacant > forecast.currentVacant ? 'error.main' : 'success.main'}>
                +{forecast.predictedVacant - forecast.currentVacant}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                projected increase in 3 months
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* High Vacancy Alert */}
      {highVacancyAlert && (
        <Alert
          severity="warning"
          icon={<WarningIcon />}
          sx={{ mb: 4, borderRadius: 2 }}
        >
          <Typography variant="subtitle2" fontWeight={700}>
            High Vacancy Alert
          </Typography>
          <Typography variant="body2">
            Predicted vacancy rate exceeds 30% in the next 3 months. Consider marketing initiatives or promotions to attract tenants.
          </Typography>
        </Alert>
      )}

      {/* Current vs Predicted — Visual Bar Chart */}
      <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mt: 2 }}>
        Current vs Predicted Vacancy by Property
      </Typography>

      {forecast.propertyBreakdown.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          No property data available.
        </Typography>
      ) : (
        <>
          {/* Visual bar comparison */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {forecast.propertyBreakdown.map((prop) => (
              <Grid size={{ xs: 12, md: 6 }} key={prop.propertyId}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                      {prop.propertyName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {prop.totalUnits} total units
                    </Typography>

                    {/* Current Vacancy */}
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600}>
                          Current Vacancy
                        </Typography>
                        <Chip
                          size="small"
                          label={`${prop.currentVacant} / ${prop.totalUnits}`}
                          color={prop.currentVacancyRate > 30 ? 'error' : 'default'}
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={prop.currentVacancyRate}
                        sx={{
                          height: 10,
                          borderRadius: 5,
                          bgcolor: alpha(theme.palette.warning.main, 0.1),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 5,
                            bgcolor: theme.palette.warning.main,
                          },
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {prop.currentVacancyRate.toFixed(1)}%
                      </Typography>
                    </Box>

                    {/* Predicted Vacancy */}
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600}>
                          Predicted Vacancy (3mo)
                        </Typography>
                        <Chip
                          size="small"
                          label={`${prop.predictedVacant} / ${prop.totalUnits}`}
                          color={prop.predictedVacancyRate > 30 ? 'error' : 'warning'}
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(prop.predictedVacancyRate, 100)}
                        sx={{
                          height: 10,
                          borderRadius: 5,
                          bgcolor: alpha(theme.palette.error.main, 0.1),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 5,
                            bgcolor: prop.predictedVacancyRate > 30 ? theme.palette.error.main : theme.palette.warning.dark,
                          },
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {prop.predictedVacancyRate.toFixed(1)}%
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Data Table */}
          <TableContainer component={Paper} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}` }} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Property</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Total Units</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Current Vacant</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Predicted Vacant</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Current Rate</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Predicted Rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {forecast.propertyBreakdown.map((prop) => (
                  <TableRow key={prop.propertyId} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {prop.propertyName}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{prop.totalUnits}</TableCell>
                    <TableCell align="center">{prop.currentVacant}</TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={prop.predictedVacant > prop.currentVacant ? 'error.main' : 'text.primary'}
                      >
                        {prop.predictedVacant}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{prop.currentVacancyRate.toFixed(1)}%</TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={prop.predictedVacancyRate > 30 ? 'error.main' : 'text.primary'}
                      >
                        {prop.predictedVacancyRate.toFixed(1)}%
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}

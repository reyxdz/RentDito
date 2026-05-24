import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert } from '@mui/material';
import { Bolt as BoltIcon, WaterDrop as WaterIcon, Wifi as WifiIcon, MoreHoriz as MoreIcon } from '@mui/icons-material';
import type { UtilityBreakdown } from '../../domain/entities/Bill';

interface UtilityBreakdownTableProps {
  breakdown: UtilityBreakdown;
  notes?: string;
}

export default function UtilityBreakdownTable({ breakdown, notes }: UtilityBreakdownTableProps) {
  // Extract allocation note if present
  const allocationNoteMatch = notes?.match(/Shared utility:[\s\S]*per occupant/i);
  const allocationNote = allocationNoteMatch ? allocationNoteMatch[0] : null;

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Utility</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Previous</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Current</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Usage</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Rate</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {breakdown.electricity && (
              <TableRow>
                <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BoltIcon color="warning" fontSize="small" /> Electricity
                </TableCell>
                <TableCell align="right">{breakdown.electricity.previousReading ?? '-'}</TableCell>
                <TableCell align="right">{breakdown.electricity.currentReading ?? '-'}</TableCell>
                <TableCell align="right">{breakdown.electricity.consumption ?? '-'}</TableCell>
                <TableCell align="right">{breakdown.electricity.rate ? `₱${breakdown.electricity.rate}` : '-'}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 500 }}>₱{breakdown.electricity.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
              </TableRow>
            )}
            
            {breakdown.water && (
              <TableRow>
                <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WaterIcon color="info" fontSize="small" /> Water
                </TableCell>
                <TableCell align="right">{breakdown.water.previousReading ?? '-'}</TableCell>
                <TableCell align="right">{breakdown.water.currentReading ?? '-'}</TableCell>
                <TableCell align="right">{breakdown.water.consumption ?? '-'}</TableCell>
                <TableCell align="right">{breakdown.water.rate ? `₱${breakdown.water.rate}` : '-'}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 500 }}>₱{breakdown.water.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
              </TableRow>
            )}

            {breakdown.internet && (
              <TableRow>
                <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WifiIcon color="primary" fontSize="small" /> Internet (Flat)
                </TableCell>
                <TableCell align="right">-</TableCell>
                <TableCell align="right">-</TableCell>
                <TableCell align="right">-</TableCell>
                <TableCell align="right">-</TableCell>
                <TableCell align="right" sx={{ fontWeight: 500 }}>₱{breakdown.internet.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
              </TableRow>
            )}

            {breakdown.others && (
              <TableRow>
                <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MoreIcon color="action" fontSize="small" /> {breakdown.others.description || 'Others'}
                </TableCell>
                <TableCell align="right">-</TableCell>
                <TableCell align="right">-</TableCell>
                <TableCell align="right">-</TableCell>
                <TableCell align="right">-</TableCell>
                <TableCell align="right" sx={{ fontWeight: 500 }}>₱{breakdown.others.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {allocationNote && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          <Typography variant="body2" fontWeight={600}>Per-head Calculation</Typography>
          <Typography variant="body2">{allocationNote}</Typography>
        </Alert>
      )}
    </Box>
  );
}

import { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useContracts } from '../../../application/hooks/useContracts';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { Description } from '@mui/icons-material';
import type { Contract } from '../../../domain/entities/Contract';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress,
} from '@mui/material';

export default function MyContracts() {
  const navigate = useNavigate();
  const { contracts, loading, error, fetchContracts } = useContracts();

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  useEffect(() => {
    if (error) console.error(error);
  }, [error]);

  return (
    <Box>
      <PageHeader
        title="My Contracts"
        subtitle="Manage your past and active rental contracts"
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={40} thickness={4} />
        </Box>
      ) : contracts.length === 0 ? (
        <EmptyState
          title="No Contracts Found"
          description="You don't have any rental contracts yet."
          icon={<Description />}
        />
      ) : (
        <Paper
          sx={{
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 4,
          }}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px', color: 'text.secondary' }}>Property</TableCell>
                  <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px', color: 'text.secondary' }}>Contract Period</TableCell>
                  <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px', color: 'text.secondary' }}>Monthly Rent</TableCell>
                  <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px', color: 'text.secondary' }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contracts.map((contract: Contract) => (
                  <TableRow
                    key={contract.id}
                    hover
                    sx={{ cursor: 'pointer', transition: 'background-color 0.2s ease' }}
                    onClick={() => navigate(`/u/contracts/${contract.id}`)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {typeof contract.propertyId === 'object' && contract.propertyId !== null
                          ? (contract.propertyId as any).name
                          : `Property ${String(contract.propertyId).slice(-6)}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {typeof contract.unitId === 'object' && contract.unitId !== null
                          ? `Unit: ${(contract.unitId as any).unitIdentifier}`
                          : `Unit ${String(contract.unitId).slice(-6)}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(contract.startDate).toLocaleDateString()} – {new Date(contract.endDate).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="primary.main">
                        ₱{contract.monthlyRent.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={contract.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}

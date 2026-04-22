import { useEffect, useState } from 'react';
import { Box, Button, TextField, MenuItem, CircularProgress, Typography, Chip } from '@mui/material';
import { KeyboardReturn, ReportProblem } from '@mui/icons-material';

import DataTable from '../../../components/DataTable';
import type { Column } from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import { useInventory } from '../../../../application/hooks/useInventory';
import DamagePenaltyDialog from './DamagePenaltyDialog';
import type { InventoryRecord } from '../../../../domain/entities/InventoryRecord';
import { format } from 'date-fns';

export default function AccountabilityRecords() {
  const { records, loading, fetchRecords, returnItem } = useInventory();
  const [statusFilter, setStatusFilter] = useState('active');

  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [recordToReturn, setRecordToReturn] = useState<InventoryRecord | null>(null);

  useEffect(() => {
    fetchRecords({
      status: statusFilter === 'All' ? undefined : statusFilter,
    });
  }, [fetchRecords, statusFilter]);

  const columns: Column<InventoryRecord>[] = [
    {
      id: 'item',
      label: 'Item Details',
      format: (_v: any, record: any) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>{record.inventoryItem?.itemName || 'Unknown Item'}</Typography>
          <Typography variant="caption" color="text.secondary">ID: {record.inventoryItemId}</Typography>
        </Box>
      )
    },
    {
      id: 'tenancy',
      label: 'Tenancy Ref',
      format: (_v: any, record: any) => (
        <Typography variant="body2">{record.tenancyId}</Typography>
      )
    },
    {
      id: 'issuedBy',
      label: 'Issued By',
      format: (_v: any, record: any) => record.issuedByUserId
    },
    {
      id: 'dates',
      label: 'Timeline',
      format: (_v: any, record: any) => (
        <Box>
          <Typography variant="body2">Out: {format(new Date(record.issuedDate), 'MMM dd, yyyy')}</Typography>
          {record.returnDate && (
            <Typography variant="body2">In: {format(new Date(record.returnDate), 'MMM dd, yyyy')}</Typography>
          )}
        </Box>
      )
    },
    {
      id: 'status',
      label: 'Status',
      format: (_v: any, record: any) => {
        if (record.status === 'damaged') {
          return <Chip size="small" color="error" icon={<ReportProblem fontSize="small" />} label="Damaged" />;
        }
        return <StatusBadge status={record.status} />;
      }
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      format: (_v: any, record: any) => (
        <Box>
          {record.status === 'active' && (
            <Button 
              size="small" 
              variant="outlined" 
              color="primary" 
              startIcon={<KeyboardReturn />}
              onClick={() => { setRecordToReturn(record); setReturnDialogOpen(true); }}
            >
              Return
            </Button>
          )}
        </Box>
      )
    }
  ];

  const handleReturnSubmit = async (data: any) => {
    if (recordToReturn) {
      await returnItem(recordToReturn.id, data, recordToReturn.inventoryItemId);
      setRecordToReturn(null);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', mb: 3 }}>
        <TextField
          select
          label="Record Status"
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="All">All Records</MenuItem>
          <MenuItem value="active">Active (Issued)</MenuItem>
          <MenuItem value="returned">Returned</MenuItem>
          <MenuItem value="damaged">Damaged / Lost</MenuItem>
        </TextField>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
      ) : (
        <DataTable columns={columns} data={records} />
      )}

      <DamagePenaltyDialog
        open={returnDialogOpen}
        onClose={() => setReturnDialogOpen(false)}
        onSubmit={handleReturnSubmit}
        record={recordToReturn}
      />
    </Box>
  );
}

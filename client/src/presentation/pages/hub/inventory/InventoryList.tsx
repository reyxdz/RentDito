import { useEffect, useState } from 'react';
import { Box, Button, TextField, MenuItem, IconButton, Tooltip, CircularProgress } from '@mui/material';
import { Add as AddIcon, AssignmentInd, Edit } from '@mui/icons-material';

import DataTable from '../../../components/DataTable';
import type { Column } from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import { useInventory } from '../../../../application/hooks/useInventory';
import InventoryForm from './InventoryForm';
import IssueItemDialog from './IssueItemDialog';
import type { Inventory } from '../../../../domain/entities/Inventory';

export default function InventoryList() {
  const { items, loading, fetchItems, createItem, updateItem, issueItem } = useInventory();
  
  const [propertyFilter, setPropertyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [formOpen, setFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Inventory | undefined>(undefined);
  
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [itemToIssue, setItemToIssue] = useState<Inventory | null>(null);

  useEffect(() => {
    fetchItems({
      propertyId: propertyFilter === 'All' ? undefined : propertyFilter,
      status: statusFilter === 'All' ? undefined : statusFilter,
    });
  }, [fetchItems, propertyFilter, statusFilter]);

  const columns: Column<Inventory>[] = [
    {
      id: 'itemName',
      label: 'Item Name',
      sortable: true,
      format: (_v: any, item: any) => (
        <Box fontWeight={500}>{item.itemName}</Box>
      )
    },
    {
      id: 'serialNumber',
      label: 'Serial No.',
      format: (_v: any, item: any) => item.serialNumber || <span style={{ color: '#aaa' }}>-</span>
    },
    {
      id: 'condition',
      label: 'Condition',
      format: (_v: any, item: any) => <Box sx={{ textTransform: 'capitalize' }}>{item.condition}</Box>
    },
    {
      id: 'quantity',
      label: 'Qty',
      format: (_v: any, item: any) => item.quantity
    },
    {
      id: 'status',
      label: 'Status',
      format: (_v: any, item: any) => <StatusBadge status={item.status} />
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      format: (_v: any, item: any) => (
        <Box>
          <Tooltip title="Edit Item">
            <IconButton size="small" onClick={() => { setSelectedItem(item); setFormOpen(true); }} color="primary">
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          {item.status === 'available' && item.quantity > 0 && (
            <Tooltip title="Issue Item">
              <IconButton size="small" onClick={() => { setItemToIssue(item); setIssueDialogOpen(true); }} color="success">
                <AssignmentInd fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )
    }
  ];

  const handleFormSubmit = async (data: Partial<Inventory>) => {
    if (selectedItem) {
      await updateItem(selectedItem.id, data);
    } else {
      await createItem(data);
    }
  };

  const handleIssueSubmit = async (data: any) => {
    await issueItem(data);
    setItemToIssue(null);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            select
            label="Property"
            size="small"
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="All">All Properties</MenuItem>
            <MenuItem value="p1">White Dorm</MenuItem>
            <MenuItem value="p2">Uytengso</MenuItem>
          </TextField>

          <TextField
            select
            label="Status"
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="All">All Statuses</MenuItem>
            <MenuItem value="available">Available</MenuItem>
            <MenuItem value="issued">Issued</MenuItem>
            <MenuItem value="maintenance">Maintenance</MenuItem>
          </TextField>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => { setSelectedItem(undefined); setFormOpen(true); }}
        >
          Add Item
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
      ) : (
        <DataTable columns={columns} data={items} />
      )}

      <InventoryForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={selectedItem}
      />

      <IssueItemDialog
        open={issueDialogOpen}
        onClose={() => setIssueDialogOpen(false)}
        onSubmit={handleIssueSubmit}
        item={itemToIssue}
      />
    </Box>
  );
}

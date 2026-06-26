import { useState, useEffect } from 'react';
import { Box, Typography, Button, Divider, Alert } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { format } from 'date-fns';

import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import InventorySignOff from '../../components/InventorySignOff';
import { inventoryService } from '../../../infrastructure/services/InventoryService';
import { useAuth } from '../../../application/context/AuthContext';
import { useNotification } from '../../../application/context/NotificationContext';
import { getTenancyId } from '../../utils/tenancyHelpers';
import type { InventoryRecord } from '../../../domain/entities/InventoryRecord';

export default function MyInventory() {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasTenancy = !!user?.activeTenancy;
  const tenancyId = getTenancyId(user?.activeTenancy);

  useEffect(() => {
    if (hasTenancy && tenancyId) {
      loadInventory();
    } else {
      setIsLoading(false);
    }
  }, [hasTenancy, tenancyId]);

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const data = await inventoryService.getRecords({ tenancyId });
      setRecords(data);
    } catch (error) {
      showNotification('Failed to load inventory', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOffSubmit = async (signatureData: string) => {
    setIsSubmitting(true);
    try {
      // Mock API call to save signature for these records
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Ideally we would update the backend to set signedFormUrl for the tenancy records
      showNotification('Inventory successfully acknowledged', 'success');
      
      // Update local state to reflect signed status
      setRecords(prev => prev.map(record => ({ ...record, signedFormUrl: 'mock_signed_form_url.pdf' })));
    } catch (error) {
      showNotification('Failed to submit sign-off form', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { 
      key: 'itemName', 
      header: 'Item',
      render: (row: InventoryRecord) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {row.inventoryItem?.itemName || 'Unknown Item'}
          </Typography>
          {row.inventoryItem?.serialNumber && (
            <Typography variant="caption" color="text.secondary">
              SN: {row.inventoryItem.serialNumber}
            </Typography>
          )}
        </Box>
      )
    },
    { key: 'quantityIssued', header: 'Qty', sortable: true },
    { 
      key: 'issuedDate', 
      header: 'Issued Date',
      render: (row: InventoryRecord) => format(new Date(row.issuedDate), 'MMM dd, yyyy'),
      sortable: true 
    },
    { 
      key: 'issuedCondition', 
      header: 'Condition at Issue',
      render: (row: InventoryRecord) => <StatusBadge status={row.issuedCondition} />
    },
    {
      key: 'status',
      header: 'Current Status',
      render: (row: InventoryRecord) => <StatusBadge status={row.status} />
    }
  ];

  // Determine if there are active items that need signing
  const activeRecords = records.filter(r => r.status === 'active');
  const needsSignature = activeRecords.length > 0 && activeRecords.some(r => !r.signedFormUrl);
  const signedFormUrl = activeRecords.find(r => r.signedFormUrl)?.signedFormUrl;

  if (!hasTenancy) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <PageHeader title="My Inventory" subtitle="Track items issued to your tenancy" />
        <Alert severity="info">You must have an active tenancy to view inventory items.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <PageHeader 
          title="My Inventory" 
          subtitle="View and acknowledge items issued to your unit" 
        />
        {signedFormUrl && (
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />}
            onClick={() => window.open(signedFormUrl, '_blank')}
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            Download Signed Form
          </Button>
        )}
      </Box>

      {needsSignature ? (
        <Box sx={{ mb: 6 }}>
          <InventorySignOff 
            records={activeRecords} 
            onSubmit={handleSignOffSubmit} 
            isSubmitting={isSubmitting}
          />
        </Box>
      ) : (
        <Box sx={{ mb: 4 }}>
          {activeRecords.length > 0 && (
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
              You have acknowledged receipt of all active inventory items.
            </Alert>
          )}
          
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Issued Items History
          </Typography>
          <DataTable
            columns={columns}
            data={records}
            keyExtractor={(row) => row.id}
            isLoading={isLoading}
            searchPlaceholder="Search items..."
          />
        </Box>
      )}
    </Box>
  );
}

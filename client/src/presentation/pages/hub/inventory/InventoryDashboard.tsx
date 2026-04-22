import { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { ViewList, Assignment, BarChart } from '@mui/icons-material';

import PageHeader from '../../../components/PageHeader';
import InventoryList from './InventoryList';
import AccountabilityRecords from './AccountabilityRecords';
import MonthlyReport from './MonthlyReport';

export default function InventoryDashboard() {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 }, pb: 10 }}>
      <PageHeader
        title="Inventory Management"
        subtitle="Manage property assets, track accountability, and review depreciation metrics."
      />

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="inventory dashboard tabs">
          <Tab icon={<ViewList fontSize="small" />} iconPosition="start" label="Items Directory" />
          <Tab icon={<Assignment fontSize="small" />} iconPosition="start" label="Accountability Records" />
          <Tab icon={<BarChart fontSize="small" />} iconPosition="start" label="Analytics & Deprecation" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <Box sx={{ display: currentTab === 0 ? 'block' : 'none' }}>
        <InventoryList />
      </Box>

      <Box sx={{ display: currentTab === 1 ? 'block' : 'none' }}>
        <AccountabilityRecords />
      </Box>

      <Box sx={{ display: currentTab === 2 ? 'block' : 'none' }}>
        <MonthlyReport />
      </Box>
    </Box>
  );
}

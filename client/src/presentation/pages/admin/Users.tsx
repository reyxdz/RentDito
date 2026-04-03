import { useState } from 'react';
import { 
  Box, Typography, Card, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Avatar, Chip, IconButton, Button, Tooltip, 
  Menu, MenuItem, useTheme, InputBase, Paper
} from '@mui/material';
import { 
  MoreVert, Search, FilterList, Edit, DeleteOutline, VerifiedUser, 
  SecurityUpdateWarning, Block
} from '@mui/icons-material';

// Mock Data targeting the Domain
const USERS = [
  { id: 1, name: 'Eleanor Pena', email: 'eleanor@example.com', role: 'Landlord', status: 'Active', verified: true, avatar: 'https://ui-avatars.com/api/?name=Eleanor+Pena&background=random' },
  { id: 2, name: 'Jacob Jones', email: 'jacob.j@example.com', role: 'Tenant', status: 'Active', verified: true, avatar: 'https://ui-avatars.com/api/?name=Jacob+Jones&background=random' },
  { id: 3, name: 'Albert Flores', email: 'albert@example.com', role: 'Tenant', status: 'Suspended', verified: false, avatar: 'https://ui-avatars.com/api/?name=Albert+Flores&background=random' },
  { id: 4, name: 'Wade Warren', email: 'wade.w@example.com', role: 'Admin', status: 'Active', verified: true, avatar: 'https://ui-avatars.com/api/?name=Wade+Warren&background=random' },
  { id: 5, name: 'Bessie Cooper', email: 'bessie@example.com', role: 'Landlord', status: 'Pending', verified: false, avatar: 'https://ui-avatars.com/api/?name=Bessie+Cooper&background=random' },
];

export default function Users() {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch(status) {
      case 'Active': return 'success';
      case 'Suspended': return 'error';
      case 'Pending': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ pb: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
           <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>User Management</Typography>
           <Typography variant="body2" color="text.secondary">Manage system roles, account statuses, and verification.</Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<VerifiedUser />}>
          Add New User
        </Button>
      </Box>

      {/* Toolbar */}
      <Card sx={{ mb: 4, p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Paper
          elevation={0}
          sx={{
            p: '2px 4px', display: 'flex', alignItems: 'center', width: 400,
            border: '1px solid ' + theme.palette.divider,
            bgcolor: 'transparent'
          }}
        >
          <IconButton sx={{ p: '10px' }} aria-label="search" disabled>
            <Search />
          </IconButton>
          <InputBase
            sx={{ ml: 1, flex: 1 }}
            placeholder="Search by name or email..."
            inputProps={{ 'aria-label': 'search users' }}
          />
        </Paper>
        <Button variant="outlined" color="inherit" startIcon={<FilterList />} sx={{ color: 'text.secondary', borderColor: 'divider' }}>
          Filters
        </Button>
      </Card>

      {/* Directory Table */}
      <Card sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Verification</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {USERS.map((row) => (
                <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar src={row.avatar} sx={{ width: 40, height: 40, border: '1px solid ' + theme.palette.divider }} />
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{row.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.email}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={row.role} 
                      size="small" 
                      color={row.role === 'Admin' ? 'primary' : 'default'}
                      variant={row.role === 'Admin' ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 600, borderRadius: 1 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={row.status} 
                      size="small" 
                      color={getStatusColor(row.status)}
                      sx={{ fontWeight: 600, borderRadius: 1 }}
                    />
                  </TableCell>
                  <TableCell>
                    {row.verified ? (
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main' }}>
                         <VerifiedUser fontSize="small" />
                         <Typography variant="caption" sx={{ fontWeight: 600 }}>Verified</Typography>
                       </Box>
                    ) : (
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'warning.main' }}>
                         <SecurityUpdateWarning fontSize="small" />
                         <Typography variant="caption" sx={{ fontWeight: 600 }}>Unverified</Typography>
                       </Box>
                    )}
                  </TableCell>
                  <TableCell align="right">
                     <Tooltip title="Edit">
                       <IconButton size="small" color="primary"><Edit fontSize="small" /></IconButton>
                     </Tooltip>
                     <Tooltip title="Manage Access">
                       <IconButton size="small" color="error"><Block fontSize="small" /></IconButton>
                     </Tooltip>
                     <IconButton size="small" onClick={handleMenuClick}><MoreVert fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={handleMenuClose}>Impersonate Login</MenuItem>
          <MenuItem onClick={handleMenuClose}>Reset Password</MenuItem>
          <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}><DeleteOutline sx={{ mr: 1, fontSize: 18 }} /> Archive User</MenuItem>
        </Menu>
      </Card>
    </Box>
  );
}

import type { ReactNode, ChangeEvent } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination, CircularProgress, TableSortLabel, Box } from '@mui/material';
import EmptyState from './EmptyState';

export type SortOrder = 'asc' | 'desc';

export interface Column<T> {
  id: keyof T | string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any, row: T) => ReactNode;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  page?: number;
  rowsPerPage?: number;
  totalCount?: number;
  onPageChange?: (event: unknown, newPage: number) => void;
  onRowsPerPageChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  sortColumn?: string;
  sortDirection?: SortOrder;
  onSort?: (columnId: string) => void;
}

export default function DataTable<T extends { id: string | number }>({
  columns,
  data,
  loading = false,
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  emptyTitle = 'No records found',
  emptyDescription = 'There is currently no data to display.',
  sortColumn,
  sortDirection = 'asc',
  onSort,
}: DataTableProps<T>) {
  
  const isPaginatable = page !== undefined && rowsPerPage !== undefined && onPageChange && onRowsPerPageChange;

  const handleSortRequest = (columnId: string) => {
    if (onSort) {
      onSort(columnId);
    }
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)', border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader aria-label="data table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={String(column.id)}
                  align={column.align}
                  style={{ minWidth: column.minWidth, fontWeight: 600 }}
                  sx={{ 
                    bgcolor: 'background.paper', 
                    borderBottom: '2px solid', 
                    borderColor: 'divider',
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '0.5px'
                  }}
                >
                  {column.sortable && onSort ? (
                    <TableSortLabel
                      active={sortColumn === String(column.id)}
                      direction={sortColumn === String(column.id) ? sortDirection : 'asc'}
                      onClick={() => handleSortRequest(String(column.id))}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 10 }}>
                  <CircularProgress size={40} thickness={4} />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} sx={{ p: 0, borderBottom: 'none' }}>
                  <Box sx={{ py: 8 }}>
                    <EmptyState title={emptyTitle} description={emptyDescription} />
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow 
                  hover 
                  role="checkbox" 
                  tabIndex={-1} 
                  key={row.id}
                  sx={{
                    transition: 'background-color 0.2s ease',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    }
                  }}
                >
                  {columns.map((column) => {
                    const value = column.id in row ? row[column.id as keyof T] : null;
                    return (
                      <TableCell key={String(column.id)} align={column.align} sx={{ py: 2 }}>
                        {column.format ? column.format(value, row) : (value as ReactNode)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {isPaginatable && !loading && data.length > 0 && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalCount ?? data.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
          sx={{ borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
        />
      )}
    </Paper>
  );
}

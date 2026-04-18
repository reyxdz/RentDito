import { useEffect, useState, useMemo } from 'react';
import { Box, Typography, MenuItem, Grid, TextField, IconButton, Tooltip, Tabs, Tab } from '@mui/material';
import {
  Visibility as ViewIcon,
  EventNote as BookingIcon,
  CalendarMonth as CalendarIcon,
  ViewList as ListIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useVisits } from '../../../../application/hooks/useVisits';
import { useProperties } from '../../../../application/hooks/useProperties';
import DataTable from '../../../components/DataTable';
import type { Column } from '../../../components/DataTable';
import type { VisitRequest, VisitStatus } from '../../../../domain/entities/VisitRequest';

/** Visit status → color-coded badge label */
const STATUS_CONFIG: Record<VisitStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: '#f59e0b' },
  approved: { label: 'Approved', color: '#3b82f6' },
  scheduled: { label: 'Scheduled', color: '#6366f1' },
  completed: { label: 'Completed', color: '#10b981' },
  cancelled: { label: 'Cancelled', color: '#6b7280' },
  no_show: { label: 'No Show', color: '#ef4444' },
};

/** Format a date string to a readable short format */
function formatDate(date?: string | Date): string {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}



/** Custom colored status chip for visits */
function VisitStatusChip({ status }: { status: VisitStatus }) {
  const config = STATUS_CONFIG[status] || { label: status, color: '#6b7280' };
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.5,
        py: 0.5,
        borderRadius: 2,
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.3px',
        textTransform: 'uppercase',
        color: config.color,
        bgcolor: `${config.color}18`,
        border: `1px solid ${config.color}30`,
      }}
    >
      <Box
        sx={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          bgcolor: config.color,
          boxShadow: `0 0 6px ${config.color}60`,
        }}
      />
      {config.label}
    </Box>
  );
}

export default function VisitList() {
  const navigate = useNavigate();
  const { visits, loading: visitsLoading, fetchVisits } = useVisits();
  const { properties, loading: propsLoading } = useProperties();

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewTab, setViewTab] = useState(0); // 0 = list, 1 = calendar

  // Fetch visits on mount
  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  // Client-side filtering
  const displayData = useMemo(() => {
    let data = visits as any[];

    if (selectedPropertyId !== 'all') {
      data = data.filter((v: any) => v.propertyId === selectedPropertyId);
    }
    if (selectedStatus !== 'all') {
      data = data.filter((v: any) => v.status === selectedStatus);
    }

    return data.map((v: any) => ({
      ...v,
      id: v._id || v.id,
    }));
  }, [visits, selectedPropertyId, selectedStatus]);

  const getPropertyName = (v: VisitRequest) => {
    if (v.property) return (v.property as any).name || 'Unknown';
    const propId = typeof v.propertyId === 'string' ? v.propertyId : (v.propertyId as any)?._id;
    return properties.find(p => p.id === propId)?.name || 'Unknown';
  };

  const getVisitorName = (v: VisitRequest) => {
    if (v.user) return (v.user as any).name || 'Unknown';
    return 'Unknown Visitor';
  };

  const getUnitName = (v: VisitRequest) => {
    if (v.unit) return (v.unit as any).unitIdentifier || '—';
    return '—';
  };

  const getStaffName = (v: VisitRequest) => {
    if (v.assignedStaff) return (v.assignedStaff as any).name || '—';
    return '—';
  };

  // Summary stat counts
  const statusCounts = useMemo(() => {
    return {
      pending: displayData.filter((v: any) => v.status === 'pending').length,
      scheduled: displayData.filter((v: any) => v.status === 'scheduled' || v.status === 'approved').length,
      completed: displayData.filter((v: any) => v.status === 'completed').length,
      total: displayData.length,
    };
  }, [displayData]);

  const columns: Column<any>[] = [
    {
      id: 'userId',
      label: 'Visitor',
      format: (_: any, row: VisitRequest) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.85rem',
              flexShrink: 0,
            }}
          >
            {getVisitorName(row).charAt(0).toUpperCase()}
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
              {getVisitorName(row)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {(row.user as any)?.email || ''}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'propertyId',
      label: 'Property',
      format: (_: any, row: VisitRequest) => (
        <Typography variant="body2" fontWeight={500}>
          {getPropertyName(row)}
        </Typography>
      ),
    },
    {
      id: 'unitId',
      label: 'Unit',
      format: (_: any, row: VisitRequest) => (
        <Typography variant="body2" color="text.secondary">
          {getUnitName(row)}
        </Typography>
      ),
    },
    {
      id: 'requestedDate',
      label: 'Requested',
      sortable: true,
      format: (value: string, row: VisitRequest) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {formatDate(value)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.requestedTime || ''}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'scheduledDate',
      label: 'Scheduled',
      sortable: true,
      format: (value: string, row: VisitRequest) => (
        <Box>
          <Typography variant="body2" fontWeight={500} color={value ? 'text.primary' : 'text.disabled'}>
            {formatDate(value)}
          </Typography>
          {row.scheduledTime && (
            <Typography variant="caption" color="text.secondary">
              {row.scheduledTime}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      format: (value: string) => <VisitStatusChip status={value as VisitStatus} />,
    },
    {
      id: 'assignedStaffId',
      label: 'Staff',
      format: (_: any, row: VisitRequest) => (
        <Typography variant="body2" color={getStaffName(row) !== '—' ? 'text.primary' : 'text.disabled'} fontWeight={500}>
          {getStaffName(row)}
        </Typography>
      ),
    },
    {
      id: 'actions',
      label: '',
      align: 'right',
      format: (_: any, row: VisitRequest & { id: string }) => (
        <Tooltip title="View Details" arrow>
          <IconButton
            size="small"
            onClick={() => navigate(`/hub/bookings/${row.id}`)}
            sx={{
              color: 'primary.main',
              '&:hover': { bgcolor: 'primary.50' },
            }}
          >
            <ViewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  const isLoading = visitsLoading || propsLoading;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
            }}
          >
            <BookingIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={800}>
              Visit Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Schedule and manage property visits across your properties.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { label: 'Total Visits', value: statusCounts.total, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.08)' },
          { label: 'Pending', value: statusCounts.pending, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' },
          { label: 'Scheduled', value: statusCounts.scheduled, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)' },
          { label: 'Completed', value: statusCounts.completed, color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)' },
        ].map(stat => (
          <Grid size={{ xs: 6, md: 3 }} key={stat.label}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: stat.bg,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 20px ${stat.color}20`,
                },
              }}
            >
              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {stat.label}
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: stat.color, mt: 0.5 }}>
                {stat.value}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* View Toggle + Filters */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Tabs
          value={viewTab}
          onChange={(_, v) => setViewTab(v)}
          sx={{
            minHeight: 40,
            '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 600 },
            '& .MuiTabs-indicator': { borderRadius: 2, height: 3 },
          }}
        >
          <Tab icon={<ListIcon fontSize="small" />} iconPosition="start" label="List View" />
          <Tab icon={<CalendarIcon fontSize="small" />} iconPosition="start" label="Calendar View" />
        </Tabs>
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              fullWidth
              label="Property"
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              size="small"
            >
              <MenuItem value="all">All Properties</MenuItem>
              {properties.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              fullWidth
              label="Status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              size="small"
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="scheduled">Scheduled</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
              <MenuItem value="no_show">No Show</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Box>

      {/* Content */}
      {viewTab === 0 ? (
        <DataTable
          columns={columns}
          data={displayData as any}
          loading={isLoading}
          emptyTitle="No Visits Found"
          emptyDescription="Once visitors request property viewings, they'll appear here."
        />
      ) : (
        /* Lazy-load VisitCalendar to avoid bundling FullCalendar if not needed */
        <VisitCalendarView
          visits={displayData as any}
          loading={isLoading}
          onEventClick={(visitId) => navigate(`/hub/bookings/${visitId}`)}
        />
      )}
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Inline Calendar View (no external dependency — pure CSS grid calendar)
   ═══════════════════════════════════════════════════════════════════════ */

interface CalendarViewProps {
  visits: any[];
  loading: boolean;
  onEventClick: (visitId: string) => void;
}

function VisitCalendarView({ visits, loading, onEventClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const navigateMonth = (dir: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + dir, 1));
  };

  // Map visits to date keys
  const visitsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    visits.forEach(v => {
      const dateStr = v.scheduledDate || v.requestedDate;
      if (!dateStr) return;
      const key = new Date(dateStr).toISOString().split('T')[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    });
    return map;
  }, [visits]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const days: { date: number; isCurrentMonth: boolean; dateKey: string }[] = [];

    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const dt = new Date(year, month - 1, d);
      days.push({ date: d, isCurrentMonth: false, dateKey: dt.toISOString().split('T')[0] });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      days.push({ date: d, isCurrentMonth: true, dateKey: dt.toISOString().split('T')[0] });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const dt = new Date(year, month + 1, d);
      days.push({ date: d, isCurrentMonth: false, dateKey: dt.toISOString().split('T')[0] });
    }

    return days;
  }, [year, month, daysInMonth, firstDayOfMonth]);

  const todayKey = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <Typography color="text.secondary">Loading calendar…</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 4,
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      {/* Calendar Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 3,
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.06) 0%, rgba(239, 68, 68, 0.06) 100%)'
              : 'linear-gradient(135deg, rgba(245, 158, 11, 0.04) 0%, rgba(239, 68, 68, 0.04) 100%)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={() => navigateMonth(-1)}>
            <Typography fontWeight={700}>‹</Typography>
          </IconButton>
          <Typography variant="h6" fontWeight={700} sx={{ minWidth: 200, textAlign: 'center' }}>
            {monthName}
          </Typography>
          <IconButton size="small" onClick={() => navigateMonth(1)}>
            <Typography fontWeight={700}>›</Typography>
          </IconButton>
        </Box>
        <Tabs
          value={viewMode === 'month' ? 0 : 1}
          onChange={(_, v) => setViewMode(v === 0 ? 'month' : 'week')}
          sx={{
            minHeight: 32,
            '& .MuiTab-root': { minHeight: 32, py: 0.5, px: 2, textTransform: 'none', fontSize: '0.8rem', fontWeight: 600 },
          }}
        >
          <Tab label="Month" />
          <Tab label="Week" />
        </Tabs>
      </Box>

      {/* Day Headers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <Box
            key={day}
            sx={{
              py: 1.5,
              textAlign: 'center',
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
            }}
          >
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {day}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Calendar Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {calendarDays.map((day, idx) => {
          const dayVisits = visitsByDate.get(day.dateKey) || [];
          const isToday = day.dateKey === todayKey;

          return (
            <Box
              key={idx}
              sx={{
                minHeight: 100,
                p: 1,
                borderRight: idx % 7 !== 6 ? '1px solid' : 'none',
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: isToday
                  ? (theme) => theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.04)'
                  : 'transparent',
                opacity: day.isCurrentMonth ? 1 : 0.35,
                transition: 'background-color 0.15s',
                '&:hover': {
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                },
              }}
            >
              {/* Day Number */}
              <Typography
                variant="caption"
                fontWeight={isToday ? 800 : 500}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  bgcolor: isToday ? 'primary.main' : 'transparent',
                  color: isToday ? '#fff' : 'text.primary',
                  mb: 0.5,
                }}
              >
                {day.date}
              </Typography>

              {/* Visit Events */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                {dayVisits.slice(0, 3).map(v => {
                  const config = STATUS_CONFIG[v.status as VisitStatus] || { label: v.status, color: '#6b7280' };
                  return (
                    <Box
                      key={v.id}
                      onClick={() => onEventClick(v.id)}
                      sx={{
                        px: 1,
                        py: 0.4,
                        borderRadius: 1.5,
                        bgcolor: `${config.color}18`,
                        borderLeft: `3px solid ${config.color}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        '&:hover': {
                          bgcolor: `${config.color}28`,
                          transform: 'scale(1.02)',
                        },
                      }}
                    >
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        sx={{
                          fontSize: '0.65rem',
                          lineHeight: 1.3,
                          color: config.color,
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {getVisitorNameFromVisit(v)}
                      </Typography>
                    </Box>
                  );
                })}
                {dayVisits.length > 3 && (
                  <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ fontSize: '0.6rem', pl: 0.5 }}>
                    +{dayVisits.length - 3} more
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function getVisitorNameFromVisit(v: VisitRequest): string {
  if (v.user) return (v.user as any).name || 'Visitor';
  return 'Visitor';
}

import type { ChipProps } from '@mui/material';

type ChipColor = ChipProps['color'];

/**
 * Maps a pipeline/inquiry status string to a MUI Chip color.
 * Reusable across MyInquiries, InquiryConversation, MyApplications, etc.
 */
export const getStatusColor = (status: string): ChipColor => {
  switch (status) {
    case 'pending':
    case 'pending_review':
    case 'under_review':
      return 'warning';
    case 'approved':
    case 'responded':
    case 'scheduled':
    case 'active':
    case 'signed':
      return 'success';
    case 'rejected':
    case 'cancelled':
    case 'no_show':
    case 'overdue':
      return 'error';
    case 'completed':
    case 'resolved':
    case 'closed':
      return 'default';
    case 'in_progress':
    case 'open':
      return 'info';
    default:
      return 'default';
  }
};

/**
 * Maps a ticket priority string to a MUI Chip color.
 */
export const getPriorityColor = (priority: string): ChipColor => {
  switch (priority) {
    case 'urgent':
    case 'emergency':
      return 'error';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    case 'low':
      return 'success';
    default:
      return 'default';
  }
};

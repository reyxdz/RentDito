import {
  Dashboard, HomeWork, MeetingRoom, People, EventNote,
  AccountBalanceWallet, Description, Receipt, Build, Handyman,
  Assessment, Inventory, Security, Groups,
  VerifiedUser, Storefront, Home, Gavel, Forum,
  Settings, BarChart, SupportAgent,
} from '@mui/icons-material';
import { createElement } from 'react';
import type { SvgIconComponent } from '@mui/icons-material';

// ─── Permission keys (must match PermissionMatrix.tsx) ──────────────────────
export const PERMISSION_KEYS = [
  'dashboard', 'properties', 'units', 'tenants', 'pipeline', 'bookings',
  'billing', 'contracts', 'utilities', 'financials', 'inventory', 'maintenance',
  'documents', 'reports', 'security', 'team'
] as const;

export type PermissionKey = typeof PERMISSION_KEYS[number];

// ─── Permission presets ─────────────────────────────────────────────────────
export const PERMISSION_PRESETS: Record<string, { label: string; permissions: PermissionKey[] }> = {
  basic_staff: {
    label: 'Basic Staff (View Only)',
    permissions: ['dashboard', 'units', 'bookings'],
  },
  manager: {
    label: 'Property Manager',
    permissions: ['dashboard', 'properties', 'units', 'tenants', 'pipeline', 'maintenance'],
  },
  accountant: {
    label: 'Accountant / Finance',
    permissions: ['dashboard', 'billing', 'financials', 'reports'],
  },
  admin: {
    label: 'Full Admin Access',
    permissions: [...PERMISSION_KEYS],
  },
};

// ─── Menu item shape ────────────────────────────────────────────────────────
export interface MenuItem {
  text: string;
  icon: SvgIconComponent;
  path: string;
  /** Required permission key — landlords skip this check (they have all) */
  permissionKey?: PermissionKey;
  /** If true, this section only shows when the user has an activeTenancy */
  requiresTenancy?: boolean;
  /** Divider label rendered above this item when it starts a new group */
  sectionLabel?: string;
}

// ─── HUB MENU (Landlord + Staff portal at /hub) ────────────────────────────
export const HUB_MENU_ITEMS: MenuItem[] = [
  { text: 'Overview',      icon: Dashboard,             path: '/hub',                 permissionKey: 'dashboard' },
  { text: 'Properties',    icon: HomeWork,              path: '/hub/properties',      permissionKey: 'properties' },
  { text: 'Units & Rooms', icon: MeetingRoom,           path: '/hub/units',           permissionKey: 'units' },
  { text: 'Tenants',       icon: People,                path: '/hub/tenants',         permissionKey: 'tenants' },
  { text: 'Pipeline',      icon: SupportAgent,          path: '/hub/pipeline',        permissionKey: 'pipeline',   sectionLabel: 'Operations' },
  { text: 'Bookings',      icon: EventNote,             path: '/hub/bookings',        permissionKey: 'bookings' },
  { text: 'Billing',       icon: Receipt,               path: '/hub/billing',         permissionKey: 'billing' },
  { text: 'Contracts',     icon: Description,           path: '/hub/contracts',       permissionKey: 'contracts' },
  { text: 'Utilities',     icon: Build,                 path: '/hub/utilities',       permissionKey: 'utilities' },
  { text: 'Financials',    icon: AccountBalanceWallet,  path: '/hub/financials',      permissionKey: 'financials', sectionLabel: 'Business' },
  { text: 'Inventory',     icon: Inventory,             path: '/hub/inventory',       permissionKey: 'inventory' },
  { text: 'Maintenance',   icon: Handyman,              path: '/hub/maintenance',     permissionKey: 'maintenance' },
  { text: 'Documents',     icon: Assessment,            path: '/hub/documents',       permissionKey: 'documents' },
  { text: 'Reports',       icon: BarChart,              path: '/hub/reports',         permissionKey: 'reports',    sectionLabel: 'Administration' },
  { text: 'Security',      icon: Security,              path: '/hub/security',        permissionKey: 'security' },
  { text: 'Team',          icon: Groups,                path: '/hub/team',            permissionKey: 'team' },
];

// ─── USER MENU (Regular user portal at /u) ──────────────────────────────────
export const USER_MENU_ITEMS: MenuItem[] = [
  // Always visible
  { text: 'My Dashboard',    icon: Dashboard,             path: '/u' },
  { text: 'Browse Listings', icon: HomeWork,              path: '/listings' },
  { text: 'My Inquiries',    icon: Forum,                 path: '/u/inquiries' },
  { text: 'My Bookings',     icon: EventNote,             path: '/u/bookings' },
  { text: 'My Applications', icon: Description,           path: '/u/applications' },
  { text: 'Verify Account',  icon: VerifiedUser,          path: '/u/verify' },
  { text: 'Become Landlord', icon: Storefront,            path: '/u/become-landlord' },
  // Tenancy-conditional section
  { text: 'My Unit',         icon: Home,                  path: '/u/my-unit',         requiresTenancy: true, sectionLabel: 'Tenancy' },
  { text: 'My Contracts',    icon: Description,           path: '/u/contracts',       requiresTenancy: true },
  { text: 'My Bills',        icon: Receipt,               path: '/u/bills',           requiresTenancy: true },
  { text: 'Maintenance',     icon: Handyman,              path: '/u/maintenance',     requiresTenancy: true },
];

// ─── ADMIN MENU (Super admin at /admin) ─────────────────────────────────────
export const ADMIN_MENU_ITEMS: MenuItem[] = [
  { text: 'Overview',             icon: Dashboard,             path: '/admin' },
  { text: 'User Management',      icon: People,                path: '/admin/users' },
  { text: 'Landlord Applications',icon: Storefront,            path: '/admin/applications' },
  { text: 'User Verifications',   icon: VerifiedUser,          path: '/admin/verifications' },
  { text: 'Properties & Listings',icon: HomeWork,              path: '/admin/properties' },
  { text: 'Financials',           icon: AccountBalanceWallet,  path: '/admin/financials' },
  { text: 'Reporting & Analytics',icon: BarChart,              path: '/admin/reports' },
  { text: 'Moderation',           icon: Gavel,                 path: '/admin/moderation' },
  { text: 'Communications',       icon: Forum,                 path: '/admin/communications' },
  { text: 'System',               icon: Settings,              path: '/admin/system' },
  { text: 'Security',             icon: Security,              path: '/admin/security' },
];

// ─── Helper: create icon element ────────────────────────────────────────────
export function renderIcon(Icon: SvgIconComponent) {
  return createElement(Icon);
}

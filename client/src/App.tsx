import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Public pages
import LandingPage from './presentation/pages/LandingPage';
import ListingsPage from './presentation/pages/listings/ListingsPage';
import PropertyDetailPage from './presentation/pages/listings/PropertyDetailPage';
import UnitDetailPage from './presentation/pages/listings/UnitDetailPage';

// Auth Pages
import Login from './presentation/pages/auth/Login';
import Register from './presentation/pages/auth/Register';
import ForgotPassword from './presentation/pages/auth/ForgotPassword';
import ResetPassword from './presentation/pages/auth/ResetPassword';

// Common pages & Components
import ProtectedRoute from './presentation/components/ProtectedRoute';
import Unauthorized from './presentation/pages/common/Unauthorized';
import NotFound from './presentation/pages/common/NotFound';
import Profile from './presentation/pages/common/Profile';

// ─── Contexts ────────────────────────────────────────────────────────
import { NotificationProvider } from './application/context/NotificationContext';

// ─── Layouts ─────────────────────────────────────────────────────────
import AdminLayout from './presentation/layouts/AdminLayout';
import HubLayout from './presentation/layouts/HubLayout';
import UserLayout from './presentation/layouts/UserLayout';

// ─── Admin pages ─────────────────────────────────────────────────────
import AdminOverview from './presentation/pages/admin/Overview';
import AdminUsers from './presentation/pages/admin/Users';
import LandlordApplications from './presentation/pages/admin/LandlordApplications';
import {
  PropertiesPlaceholder as AdminProperties,
  FinancialsPlaceholder as AdminFinancials,
  ReportsPlaceholder as AdminReports,
  ModerationPlaceholder as AdminModeration,
  CommunicationsPlaceholder as AdminComms,
  SystemPlaceholder as AdminSystem,
  SecurityPlaceholder as AdminSecurity,
} from './presentation/pages/admin/Placeholders';

// ─── Hub pages (Landlord + Staff) ────────────────────────────────────
import HubOverview from './presentation/pages/hub/overview/Overview';
import TeamManagement from './presentation/pages/hub/team/TeamManagement';
import {
  HubTenantsPlaceholder,
  HubPipelinePlaceholder,
  HubBookingsPlaceholder,
  HubBillingPlaceholder,
  HubContractsPlaceholder,
  HubUtilitiesPlaceholder,
  HubFinancialsPlaceholder,
  HubInventoryPlaceholder,
  HubMaintenancePlaceholder,
  HubDocumentsPlaceholder,
  HubReportsPlaceholder,
  HubSecurityPlaceholder,
} from './presentation/pages/hub/Placeholders';

import PropertyList from './presentation/pages/hub/properties/PropertyList';
import PropertyForm from './presentation/pages/hub/properties/PropertyForm';

import UnitList from './presentation/pages/hub/units/UnitList';
import UnitDetail from './presentation/pages/hub/units/UnitDetail';

import InquiryList from './presentation/pages/hub/pipeline/InquiryList';
import InquiryDetail from './presentation/pages/hub/pipeline/InquiryDetail';

// ─── User pages ──────────────────────────────────────────────────────
import VerifyAccount from './presentation/pages/user/VerifyAccount';
import BecomeLandlord from './presentation/pages/user/BecomeLandlord';
import Dashboard from './presentation/pages/user/Dashboard';
import {
  UserInquiries,
  UserBookings,
  UserMyUnit,
  UserBills,
  UserContract,
  UserMaintenance,
} from './presentation/pages/user/Placeholders';

function App() {
  return (
    <NotificationProvider>
      <Router>
      <Routes>
        {/* ────── Public ────────────────────────────────────────────── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/listings" element={<ListingsPage />} />
        <Route path="/listings/:propertyId" element={<PropertyDetailPage />} />
        <Route path="/listings/unit/:unitId" element={<UnitDetailPage />} />

        {/* ────── Auth ──────────────────────────────────────────────── */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* ────── Admin Layout (super_admin) ────────────────────────── */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['super_admin']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="applications" element={<LandlordApplications />} />
          <Route path="properties" element={<AdminProperties />} />
          <Route path="financials" element={<AdminFinancials />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="moderation" element={<AdminModeration />} />
          <Route path="communications" element={<AdminComms />} />
          <Route path="system" element={<AdminSystem />} />
          <Route path="security" element={<AdminSecurity />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* ────── Hub Layout (landlord + staff) ─────────────────────── */}
        <Route path="/hub" element={<ProtectedRoute allowedRoles={['landlord', 'staff']}><HubLayout /></ProtectedRoute>}>
          <Route index element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="dashboard"><HubOverview /></ProtectedRoute>} />
          <Route path="properties">
            <Route index element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="properties"><PropertyList /></ProtectedRoute>} />
            <Route path="new" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="properties"><PropertyForm /></ProtectedRoute>} />
            <Route path=":propertyId/edit" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="properties"><PropertyForm /></ProtectedRoute>} />
          </Route>
          <Route path="units">
            <Route index element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="units"><UnitList /></ProtectedRoute>} />
            <Route path=":unitId" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="units"><UnitDetail /></ProtectedRoute>} />
          </Route>
          <Route path="tenants" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="tenants"><HubTenantsPlaceholder /></ProtectedRoute>} />
          <Route path="pipeline">
            <Route index element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="pipeline"><InquiryList /></ProtectedRoute>} />
            <Route path="inquiries" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="pipeline"><InquiryList /></ProtectedRoute>} />
            <Route path="inquiries/:inquiryId" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="pipeline"><InquiryDetail /></ProtectedRoute>} />
          </Route>
          <Route path="bookings" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="bookings"><HubBookingsPlaceholder /></ProtectedRoute>} />
          <Route path="billing" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="billing"><HubBillingPlaceholder /></ProtectedRoute>} />
          <Route path="contracts" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="contracts"><HubContractsPlaceholder /></ProtectedRoute>} />
          <Route path="utilities" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="utilities"><HubUtilitiesPlaceholder /></ProtectedRoute>} />
          <Route path="financials" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="financials"><HubFinancialsPlaceholder /></ProtectedRoute>} />
          <Route path="inventory" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="inventory"><HubInventoryPlaceholder /></ProtectedRoute>} />
          <Route path="maintenance" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="maintenance"><HubMaintenancePlaceholder /></ProtectedRoute>} />
          <Route path="documents" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="documents"><HubDocumentsPlaceholder /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="reports"><HubReportsPlaceholder /></ProtectedRoute>} />
          <Route path="security" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="security"><HubSecurityPlaceholder /></ProtectedRoute>} />
          <Route path="team" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="team"><TeamManagement /></ProtectedRoute>} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* ────── User Layout (regular user) ────────────────────────── */}
        <Route path="/u" element={<ProtectedRoute><UserLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="inquiries" element={<UserInquiries />} />
          <Route path="bookings" element={<UserBookings />} />
          <Route path="verify" element={<VerifyAccount />} />
          <Route path="become-landlord" element={<BecomeLandlord />} />
          <Route path="my-unit" element={<UserMyUnit />} />
          <Route path="bills" element={<UserBills />} />
          <Route path="contract" element={<UserContract />} />
          <Route path="maintenance" element={<UserMaintenance />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* ────── Legacy redirect: /landlord → /hub ─────────────────── */}
        <Route path="/landlord/*" element={<Navigate to="/hub" replace />} />

        {/* ────── Error routes ──────────────────────────────────────── */}
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* ────── Catch-all ─────────────────────────────────────────── */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  </NotificationProvider>
  )
}

export default App;

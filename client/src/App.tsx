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
import UserVerifications from './presentation/pages/admin/UserVerifications';
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
  HubFinancialsPlaceholder,
  HubDocumentsPlaceholder,
  HubSecurityPlaceholder,
} from './presentation/pages/hub/Placeholders';

import BillList from './presentation/pages/hub/billing/BillList';
import BillDetail from './presentation/pages/hub/billing/BillDetail';
import UtilityDashboard from './presentation/pages/hub/utilities/UtilityDashboard';
import InventoryDashboard from './presentation/pages/hub/inventory/InventoryDashboard';

import TicketList from './presentation/pages/hub/maintenance/TicketList';
import TicketDetail from './presentation/pages/hub/maintenance/TicketDetail';

import PropertyList from './presentation/pages/hub/properties/PropertyList';
import PropertyForm from './presentation/pages/hub/properties/PropertyForm';

import UnitList from './presentation/pages/hub/units/UnitList';
import UnitForm from './presentation/pages/hub/units/UnitForm';
import UnitDetail from './presentation/pages/hub/units/UnitDetail';

import InquiryList from './presentation/pages/hub/pipeline/InquiryList';
import InquiryDetail from './presentation/pages/hub/pipeline/InquiryDetail';
import ApplicationList from './presentation/pages/hub/pipeline/ApplicationList';
import ApplicationDetail from './presentation/pages/hub/pipeline/ApplicationDetail';
import TransferList from './presentation/pages/hub/pipeline/TransferList';
import TransferDetail from './presentation/pages/hub/pipeline/TransferDetail';

import VisitList from './presentation/pages/hub/bookings/VisitList';
import VisitDetail from './presentation/pages/hub/bookings/VisitDetail';

import ContractList from './presentation/pages/hub/contracts/ContractList';
import ContractDetail from './presentation/pages/hub/contracts/ContractDetail';
import ContractForm from './presentation/pages/hub/contracts/ContractForm';

import TenantList from './presentation/pages/hub/tenants/TenantList';
import TenantDetail from './presentation/pages/hub/tenants/TenantDetail';

import ReportsDashboard from './presentation/pages/hub/reports/ReportsDashboard';

// ─── User pages ──────────────────────────────────────────────────────
import VerifyAccount from './presentation/pages/user/VerifyAccount';
import BecomeLandlord from './presentation/pages/user/BecomeLandlord';
import Dashboard from './presentation/pages/user/Dashboard';
import MyInquiries from './presentation/pages/user/MyInquiries';
import InquiryConversation from './presentation/pages/user/InquiryConversation';
import MyVisits from './presentation/pages/user/MyVisits';
import MyApplications from './presentation/pages/user/MyApplications';
import {
  UserMyUnit,
  UserBills,
  UserMaintenance,
} from './presentation/pages/user/Placeholders';

import MyContracts from './presentation/pages/user/MyContracts';
import ContractView from './presentation/pages/user/ContractView';

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
            <Route path="verifications" element={<UserVerifications />} />
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
              <Route path="new" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="units"><UnitForm /></ProtectedRoute>} />
              <Route path=":unitId/edit" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="units"><UnitForm /></ProtectedRoute>} />
            </Route>
            <Route path="tenants">
               <Route index element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="tenants"><TenantList /></ProtectedRoute>} />
               <Route path=":tenancyId" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="tenants"><TenantDetail /></ProtectedRoute>} />
            </Route>
            <Route path="pipeline">
              <Route index element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="pipeline"><InquiryList /></ProtectedRoute>} />
              <Route path="inquiries" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="pipeline"><InquiryList /></ProtectedRoute>} />
              <Route path="inquiries/:inquiryId" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="pipeline"><InquiryDetail /></ProtectedRoute>} />
              <Route path="applications" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="pipeline"><ApplicationList /></ProtectedRoute>} />
              <Route path="applications/:applicationId" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="pipeline"><ApplicationDetail /></ProtectedRoute>} />
              <Route path="transfers" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="pipeline"><TransferList /></ProtectedRoute>} />
              <Route path="transfers/:transferId" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="pipeline"><TransferDetail /></ProtectedRoute>} />
            </Route>
            <Route path="bookings">
              <Route index element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="bookings"><VisitList /></ProtectedRoute>} />
              <Route path=":visitId" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="bookings"><VisitDetail /></ProtectedRoute>} />
            </Route>
            <Route path="billing">
              <Route index element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="billing"><BillList /></ProtectedRoute>} />
              <Route path=":billId" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="billing"><BillDetail /></ProtectedRoute>} />
            </Route>
            <Route path="contracts">
              <Route index element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="contracts"><ContractList /></ProtectedRoute>} />
              <Route path="new" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="contracts"><ContractForm /></ProtectedRoute>} />
              <Route path=":contractId" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="contracts"><ContractDetail /></ProtectedRoute>} />
            </Route>
            <Route path="utilities" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="utilities"><UtilityDashboard /></ProtectedRoute>} />
            <Route path="financials" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="financials"><HubFinancialsPlaceholder /></ProtectedRoute>} />
            <Route path="inventory" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="inventory"><InventoryDashboard /></ProtectedRoute>} />
            <Route path="maintenance">
               <Route index element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="maintenance"><TicketList /></ProtectedRoute>} />
               <Route path=":ticketId" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="maintenance"><TicketDetail /></ProtectedRoute>} />
            </Route>
            <Route path="documents" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="documents"><HubDocumentsPlaceholder /></ProtectedRoute>} />
            <Route path="reports" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="reports"><ReportsDashboard /></ProtectedRoute>} />
            <Route path="security" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="security"><HubSecurityPlaceholder /></ProtectedRoute>} />
            <Route path="team" element={<ProtectedRoute allowedRoles={['landlord', 'staff']} requiredPermission="team"><TeamManagement /></ProtectedRoute>} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* ────── User Layout (regular user) ────────────────────────── */}
          <Route path="/u" element={<ProtectedRoute><UserLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="inquiries" element={<MyInquiries />} />
            <Route path="inquiries/:inquiryId" element={<InquiryConversation />} />
            <Route path="bookings" element={<MyVisits />} />
            <Route path="applications" element={<MyApplications />} />
            <Route path="verify" element={<VerifyAccount />} />
            <Route path="become-landlord" element={<BecomeLandlord />} />
            <Route path="my-unit" element={<UserMyUnit />} />
            <Route path="bills" element={<UserBills />} />
            <Route path="contracts">
              <Route index element={<MyContracts />} />
              <Route path=":contractId" element={<ContractView />} />
            </Route>
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

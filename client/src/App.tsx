import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './presentation/pages/LandingPage';
import AdminLayout from './presentation/layouts/AdminLayout';
import Overview from './presentation/pages/admin/Overview';
import { 
  PropertiesPlaceholder, FinancialsPlaceholder, 
  ReportsPlaceholder, ModerationPlaceholder, CommunicationsPlaceholder, 
  SystemPlaceholder, SecurityPlaceholder 
} from './presentation/pages/admin/Placeholders';
import Users from './presentation/pages/admin/Users';
import ProtectedRoute from './presentation/components/ProtectedRoute';
import Login from './presentation/pages/auth/Login';

import LandlordLayout from './presentation/layouts/LandlordLayout';
import LandlordOverview from './presentation/pages/landlord/Overview';
import {
  PropertiesPlaceholder as LandlordProperties,
  UnitsPlaceholder,
  BookingsPlaceholder,
  FinancialsPlaceholder as LandlordFinancials,
  AgentsPlaceholder,
  MaintenancePlaceholder
} from './presentation/pages/landlord/Placeholders';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Overview />} />
          <Route path="users" element={<Users />} />
          <Route path="properties" element={<PropertiesPlaceholder />} />
          <Route path="financials" element={<FinancialsPlaceholder />} />
          <Route path="reports" element={<ReportsPlaceholder />} />
          <Route path="moderation" element={<ModerationPlaceholder />} />
          <Route path="communications" element={<CommunicationsPlaceholder />} />
          <Route path="system" element={<SystemPlaceholder />} />
          <Route path="security" element={<SecurityPlaceholder />} />
        </Route>

        <Route 
          path="/landlord" 
          element={
            <ProtectedRoute allowedRoles={['landlord']}>
              <LandlordLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<LandlordOverview />} />
          <Route path="properties" element={<LandlordProperties />} />
          <Route path="units" element={<UnitsPlaceholder />} />
          <Route path="bookings" element={<BookingsPlaceholder />} />
          <Route path="financials" element={<LandlordFinancials />} />
          <Route path="agents" element={<AgentsPlaceholder />} />
          <Route path="maintenance" element={<MaintenancePlaceholder />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App;

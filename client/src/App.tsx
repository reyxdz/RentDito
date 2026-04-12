import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import ListingsPage from './presentation/pages/listings/ListingsPage';
import PropertyDetailPage from './presentation/pages/listings/PropertyDetailPage';
import UnitDetailPage from './presentation/pages/listings/UnitDetailPage';

// Auth Pages
import Login from './presentation/pages/auth/Login';
import Register from './presentation/pages/auth/Register';
import ForgotPassword from './presentation/pages/auth/ForgotPassword';
import ResetPassword from './presentation/pages/auth/ResetPassword';

// User / Onboarding Pages
import VerifyAccount from './presentation/pages/user/VerifyAccount';
import BecomeLandlord from './presentation/pages/user/BecomeLandlord';

// Admin / Hub Pages
import LandlordApplications from './presentation/pages/admin/LandlordApplications';
import TeamManagement from './presentation/pages/hub/team/TeamManagement';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/listings" replace />} />
        
        {/* PUBLIC LISTINGS */}
        <Route path="/listings" element={<ListingsPage />} />
        <Route path="/listings/:propertyId" element={<PropertyDetailPage />} />
        <Route path="/listings/unit/:unitId" element={<UnitDetailPage />} />

        {/* AUTH */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Phase 1 Day 3 - Direct routes prior to Paul's full Layout config */}
        <Route path="/u/verify" element={<VerifyAccount />} />
        <Route path="/u/become-landlord" element={<BecomeLandlord />} />
        <Route path="/admin/applications" element={<LandlordApplications />} />
        <Route path="/hub/team" element={<TeamManagement />} />

        {/* Catch-all: redirect unknown routes to listings */}
        <Route path="*" element={<Navigate to="/listings" replace />} />
      </Routes>
    </Router>
  )
}

export default App;

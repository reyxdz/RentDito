import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import ListingsPage from './presentation/pages/listings/ListingsPage';
import PropertyDetailPage from './presentation/pages/listings/PropertyDetailPage';
import UnitDetailPage from './presentation/pages/listings/UnitDetailPage';

// Auth Pages (Temporarily added for development)
import Login from './presentation/pages/auth/Login';
import Register from './presentation/pages/auth/Register';
import ForgotPassword from './presentation/pages/auth/ForgotPassword';
import ResetPassword from './presentation/pages/auth/ResetPassword';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/listings" replace />} />
        
        {/* PUBLIC LISTINGS */}
        <Route path="/listings" element={<ListingsPage />} />
        <Route path="/listings/:propertyId" element={<PropertyDetailPage />} />
        <Route path="/listings/unit/:unitId" element={<UnitDetailPage />} />

        {/* AUTH ROUTES */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Catch-all: redirect unknown routes to listings */}
        <Route path="*" element={<Navigate to="/listings" replace />} />
      </Routes>
    </Router>
  )
}

export default App;

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import ListingsPage from './presentation/pages/listings/ListingsPage';
import PropertyDetailPage from './presentation/pages/listings/PropertyDetailPage';
import UnitDetailPage from './presentation/pages/listings/UnitDetailPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/listings" replace />} />
        
        {/* PUBLIC LISTINGS */}
        <Route path="/listings" element={<ListingsPage />} />
        <Route path="/listings/:propertyId" element={<PropertyDetailPage />} />
        <Route path="/listings/unit/:unitId" element={<UnitDetailPage />} />

        {/* Catch-all: redirect unknown routes to listings */}
        <Route path="*" element={<Navigate to="/listings" replace />} />
      </Routes>
    </Router>
  )
}

export default App;

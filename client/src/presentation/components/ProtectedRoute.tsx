import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../application/context/AuthContext';
import type { Role } from '../../domain/entities/User';
import React from 'react';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: Role[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Intercept flow and redirect specifically to login keeping the intended path in state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin routing logic
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // If not admin but forced admin access, throw to standard user dashboard
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

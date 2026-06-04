import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../application/context/AuthContext';
import type { Role } from '../../domain/entities/User';
import type { PermissionKey } from '../../application/config/menuConfig';
import React from 'react';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: Role[];
  requiredPermission?: PermissionKey;
}

export default function ProtectedRoute({ children, allowedRoles, requiredPermission }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    // Intercept flow and redirect specifically to login keeping the intended path in state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin routing logic
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // If not admin but forced admin access, throw to standard user dashboard
    return <Navigate to="/unauthorized" replace />;
  }

  // Permission logic for hub routes
  if (requiredPermission && user) {
    // super_admin bypasses all permission checks
    if (user.role === 'super_admin') {
      // Allow access
    } else if (user.role === 'staff' || user.role === 'landlord') {
      if (!user.permissions || !user.permissions.includes(requiredPermission)) {
        return <Navigate to="/unauthorized" replace />;
      }
    } else {
      // Regular users should not be in permission-gated routes
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
}

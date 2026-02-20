import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../context/PermissionContext';

const ProtectedRoute = ({ children, permission, anyPermission }) => {
  const { hasPermission, hasAnyPermission, loading } = usePermissions();

  if (loading) {
    return <div>Loading...</div>;
  }

  // Check if user has ANY of the specified permissions (OR logic)
  if (anyPermission) {
    if (!hasAnyPermission(...anyPermission)) {
      return <Navigate to="/dashboard" replace />;
    }
  } else if (permission && !hasPermission(permission)) {
    // Single permission check (backward compatible)
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;

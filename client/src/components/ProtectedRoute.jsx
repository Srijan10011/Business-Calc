import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../context/PermissionContext';

const ProtectedRoute = ({ children, permission }) => {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;

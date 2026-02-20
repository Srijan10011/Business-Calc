import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setSnackbarFunction } from '../utils/api';
import { useSnackbar } from './SnackbarContext';

const PermissionContext = createContext();

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionProvider');
  }
  return context;
};

export const PermissionProvider = ({ children }) => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    // Set snackbar function for API interceptor
    setSnackbarFunction(showSnackbar);
    fetchPermissions();
  }, [showSnackbar]);

  const fetchPermissions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/business-users/permissions', {
        headers: { 'x-auth-token': token }
      });
      setPermissions(res.data);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      showSnackbar('Failed to fetch permissions. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permissionKey) => {
    const userRole = localStorage.getItem('userRole');
    if (userRole?.toLowerCase() === 'owner') return true;
    return permissions.some(p => p.permission_key === permissionKey);
  };

  const hasAnyPermission = (...permissionKeys) => {
    const userRole = localStorage.getItem('userRole');
    if (userRole?.toLowerCase() === 'owner') return true;
    return permissionKeys.some(key => 
      permissions.some(p => p.permission_key === key)
    );
  };

  const refreshPermissions = () => {
    fetchPermissions();
  };

  return (
    <PermissionContext.Provider value={{ permissions, hasPermission, hasAnyPermission, loading, refreshPermissions }}>
      {children}
    </PermissionContext.Provider>
  );
};

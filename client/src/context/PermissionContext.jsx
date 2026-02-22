import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setSnackbarFunction } from '../utils/api';
import { useSnackbar } from './SnackbarContext';

const PermissionContext = createContext();

export const PermissionProvider = ({ children }) => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    setSnackbarFunction(showSnackbar);
  }, [showSnackbar]);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const res = await api.get('/business-users/permissions');
      setPermissions(res.data);
    } catch (err) {
      // Silently fail on 401 (not authenticated) and other errors
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

// Export hook separately at the end
export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionProvider');
  }
  return context;
};

import axios from 'axios';

// Create axios instance with credentials support
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true  // Send cookies with requests
});

// Store snackbar function
let showSnackbarFn = null;

export const setSnackbarFunction = (fn) => {
  showSnackbarFn = fn;
};

// Add request interceptor for permission context
api.interceptors.request.use(
  (config) => {
    // Add permission context if specified
    if (config.permissionContext) {
      config.headers['x-permission-context'] = config.permissionContext;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors and auto-refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized - try to refresh token
    if (error.response?.status === 401) {
      const isVerifyEndpoint = originalRequest?.url?.includes('/auth/verify');
      const isRefreshEndpoint = originalRequest?.url?.includes('/auth/refresh');
      const isPermissionsEndpoint = originalRequest?.url?.includes('/business-users/permissions');
      
      // Don't retry refresh endpoint itself (prevent infinite loop)
      if (isRefreshEndpoint) {
        localStorage.removeItem('userRole');
        window.location.href = '/login';
        return Promise.reject(error);
      }
      
      // Don't auto-refresh for verify endpoint or permissions endpoint
      if (isVerifyEndpoint || isPermissionsEndpoint) {
        return Promise.reject(error);
      }
      
      // Try to refresh token (only once per request)
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          // Call refresh endpoint
          await api.post('/auth/refresh');
          
          // Retry the original request with new token
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed - redirect to login
          localStorage.removeItem('userRole');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    // Show permission denied notification only for write operations
    if (error.response?.status === 403) {
      const method = error.config?.method?.toUpperCase();
      const isWriteOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
      
      if (isWriteOperation && showSnackbarFn) {
        const message = error.response?.data?.msg || 'Permission Denied: You do not have permission to perform this action';
        showSnackbarFn(message, 'error');
      }
    }
    return Promise.reject(error);
  }
);

export default api;

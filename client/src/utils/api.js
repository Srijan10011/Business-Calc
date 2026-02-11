import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

// Store snackbar function
let showSnackbarFn = null;

export const setSnackbarFunction = (fn) => {
  showSnackbarFn = fn;
};

// Add request interceptor to include token and context
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    
    // Add permission context if specified
    if (config.permissionContext) {
      config.headers['x-permission-context'] = config.permissionContext;
      console.log('Adding permission context:', config.permissionContext);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Show permission denied notification only for write operations (POST, PUT, DELETE)
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

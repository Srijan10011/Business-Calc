import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import api from '../utils/api';
import { CircularProgress, Box } from '@mui/material';

const PrivateRoute = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    useEffect(() => {
        // Check authentication by making API call
        // If cookie is valid, server will respond with 200
        api.get('/auth/verify')
            .then(() => setIsAuthenticated(true))
            .catch(() => setIsAuthenticated(false));
    }, []);

    // Loading state
    if (isAuthenticated === null) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Authenticated - render children or outlet
    return children ? <>{children}</> : <Outlet />;
};

export default PrivateRoute;
import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import api from '../utils/api';
import { CircularProgress, Box } from '@mui/material';

const PrivateRoute = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    useEffect(() => {
        const verifyAuth = async () => {
            try {
                await api.get('/auth/verify');
                setIsAuthenticated(true);
            } catch (err) {
                console.error('Auth verification failed:', err);
                setIsAuthenticated(false);
            }
        };
        verifyAuth();
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
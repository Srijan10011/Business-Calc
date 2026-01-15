import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
    const isAuthenticated = localStorage.getItem('token'); // Check if a token exists
    if (!isAuthenticated) {
        // If not authenticated, redirect to the login page
        return <Navigate to="/login" replace/>;
    }
    // If authenticated, render the children routes (or Outlet for nested routes)
    return children ? <>{children}</> : <Outlet />;
};

export default PrivateRoute;
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import DashboardLayout from './layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Inventory from './pages/Inventory';
import Finance from './pages/Finance';
import Assets from './pages/Assets';
import Products from './pages/Products';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Home from './pages/Home'; // We'll create a simple Home page component

import CustomerProfile from './pages/CustomerProfile';
import ProductDetail from './pages/ProductDetail'; // Import ProductDetail
import PrivateRoute from './components/PrivateRoute'; // Import PrivateRoute

const App: React.FC = () => {
    return (
        <Router>
            <Routes>
                {/* Public routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected routes */}
                <Route element={<PrivateRoute />}>
                    <Route element={<DashboardLayout />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/sales" element={<Sales />} />
                        <Route path="/customers" element={<Customers />} />
                        <Route path="/customers/:customerId" element={<CustomerProfile />} />
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/finance" element={<Finance />} />
                        <Route path="/assets" element={<Assets />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/products/:productId" element={<ProductDetail />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/settings" element={<Settings />} />
                    </Route>
                </Route>
            </Routes>
        </Router>
    );
};

export default App;

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import Team from './pages/Team';
import TeamProfile from './pages/TeamProfile';
import Home from './pages/Home';
import CustomerProfile from './pages/CustomerProfile';
import ProductDetail from './pages/ProductDetail';
import Credits from './pages/Credits';
import Admin from './pages/Admin';
import PrivateRoute from './components/PrivateRoute';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { PermissionProvider } from './context/PermissionContext';
import { SnackbarProvider } from './context/SnackbarContext';

const App = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SnackbarProvider>
          <PermissionProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<PrivateRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/sales" element={<ProtectedRoute anyPermission={['sales.view', 'sales.create']}><Sales /></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute permission="customers.view"><Customers /></ProtectedRoute>} />
              <Route path="/customers/:customerId" element={<ProtectedRoute permission="customers.view"><CustomerProfile /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute permission="inventory.view"><Inventory /></ProtectedRoute>} />
              <Route path="/finance" element={<ProtectedRoute permission="finance.view"><Finance /></ProtectedRoute>} />
              <Route path="/credits" element={<ProtectedRoute permission="credits.view"><Credits /></ProtectedRoute>} />
              <Route path="/assets" element={<ProtectedRoute permission="assets.view"><Assets /></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute permission="products.view"><Products /></ProtectedRoute>} />
              <Route path="/products/:productId" element={<ProtectedRoute permission="products.view"><ProductDetail /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute permission="reports.view"><Reports /></ProtectedRoute>} />
              <Route path="/team" element={<ProtectedRoute permission="team.view"><Team /></ProtectedRoute>} />
              <Route path="/team/:memberId" element={<ProtectedRoute permission="team.view"><TeamProfile /></ProtectedRoute>} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
        </PermissionProvider>
      </SnackbarProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;

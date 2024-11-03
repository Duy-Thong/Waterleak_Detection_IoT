import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { UserProvider, useUser } from './contexts/UserContext';
import Home from './pages/Home/Home';
import Register from './pages/Register/Register';
import ManageDevices from './pages/ManageDevices';
import AccountManagement from './pages/AccountManagement';
import ForgotPassword from './pages/ForgotPassword';
import DeviceHistory from './pages/DeviceHistory';
import Login from './pages/Login/Login';
import DeviceDetail from './pages/DeviceDetail/DeviceDetail';
import WarningPage from './pages/WarningPage/WarningPage';
import RequireLogin from './components/RequireLogin';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { userId } = useUser();
  const location = useLocation();

  if (!userId) {
    return <RequireLogin returnUrl={location.pathname} />;
  }

  return children;
};

// Main App Component
function AppContent() {
  const { setUserId } = useUser();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      setUserId(userId);
    }
  }, [setUserId]);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/home" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/device/:deviceId" element={
          <ProtectedRoute>
            <DeviceDetail />
          </ProtectedRoute>
        } />
        <Route path="/device/:deviceId/history" element={
          <ProtectedRoute>
            <DeviceHistory />
          </ProtectedRoute>
        } />
        <Route path="/account-management" element={
          <ProtectedRoute>
            <AccountManagement />
          </ProtectedRoute>
        } />
        <Route path="/manage-devices" element={
          <ProtectedRoute>
            <ManageDevices />
          </ProtectedRoute>
        } />
        <Route path="device/:deviceId/warnings" element={
          <ProtectedRoute>
            <WarningPage />
          </ProtectedRoute>
        } />

        {/* Catch all redirect */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Router>
  );
}

// Wrapper with UserProvider
function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

export default App;
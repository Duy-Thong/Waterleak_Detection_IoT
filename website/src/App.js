import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
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
import './App.css';
function App() {
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
        <Route path="*" element={<Home />} />
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path='/forgot-password' element={<ForgotPassword />} />
        <Route path="/device/:deviceId/history" element={<DeviceHistory />} />
        <Route path="/account-management" element={<AccountManagement />} />
        <Route path="/manage-devices" element={<ManageDevices />} />
        <Route path="/device/:deviceId" element={<DeviceDetail />} />
        <Route path='device/:deviceId/warnings' element= {<WarningPage />} />
      </Routes>
    </Router>
  );
}

export default App;
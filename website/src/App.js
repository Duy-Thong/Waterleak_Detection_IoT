import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { UserProvider, useUser } from './contexts/UserContext';
import Home from './components/Home/Home';
import Login from './components/Login/login';
import Register from './components/Register/Register';
import ManageDevices from './components/ManageDevices';
import AccountManagement from './components/AccountManagement';
import ForgotPassword from './components/ForgotPassword';
import DeviceHistory from './components/DeviceHistory';
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
        <Route path="*" element={<Login />} />
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path='/forgot-password' element={<ForgotPassword />} />
        <Route path="/device/:deviceId/history" element={<DeviceHistory />} />
        <Route path="/account-management" element={<AccountManagement />} />
        <Route path="/manage-devices" element={<ManageDevices />} />
      </Routes>
    </Router>
  );
}

export default App;
// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext'; // Import UserProvider
import Home from './components/Home/Home';
import Login from './components/Login/Login';
import Register from './components/Register/Register';
import ManageDevices from './components/ManageDevices';
import AccountManagement from './components/AccountManagement';
import ForgotPassword from './components/ForgotPassword';
function App() {
  return (
    <UserProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path='/forgot-password' element={<ForgotPassword />} />
          <Route path="/account-management" element={<AccountManagement />} />
          <Route path="/manage-devices" element={<ManageDevices />} />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;

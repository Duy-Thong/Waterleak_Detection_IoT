// Navbar.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ onLogout }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const navigate = useNavigate();

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    const handleAccountManagement = () => {
        navigate('/account-management'); // Change this route to your account management page
    };

    return (
        <nav className="flex justify-between items-center p-4 bg-blue-400 text-white">
            <div className="text-lg font-bold">Water Leak Detection</div>
            <div className="relative">
                <button onClick={toggleDropdown} className="flex items-center">
                    <img
                        src="https://static.vecteezy.com/system/resources/previews/019/896/008/original/male-user-avatar-icon-in-flat-design-style-person-signs-illustration-png.png" // Replace with your default avatar image path
                        alt="Avatar"
                        className="w-8 h-8 rounded-full"
                    />
                </button>
                {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-md shadow-lg z-10">
                        <button
                            className="block px-4 py-2 hover:bg-gray-200 w-full text-left"
                            onClick={handleAccountManagement}
                        >
                            Quản lý tài khoản
                        </button>
                        <button
                            className="block px-4 py-2 hover:bg-gray-200 w-full text-left"
                            onClick={onLogout}
                        >
                            Đăng xuất
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;

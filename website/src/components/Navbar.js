import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Dropdown, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const Navbar = ({ onLogout }) => {
    const navigate = useNavigate();

    const handleAccountManagement = () => {
        navigate('/account-management');
    };

    const handleLogout = () => {
        localStorage.removeItem('userId'); // Remove userId from localStorage
        onLogout();
        navigate('/login');
    };

    const handleTitleClick = () => {
        navigate('/home'); // Navigate to /home
    };

    const menu = (
        <Menu>
            <Menu.Item key="1" onClick={handleAccountManagement}>
                Quản lý tài khoản
            </Menu.Item>
            <Menu.Item key="2" onClick={handleLogout}>
                Đăng xuất
            </Menu.Item>
        </Menu>
    );

    return (
        <nav className="flex justify-between items-center p-4 bg-blue-400 text-white">
            <div
                className="text-lg font-bold cursor-pointer"
                onClick={handleTitleClick} // Add click handler for title
            >
                Water Leak Detection
            </div>
            <div>
                <Dropdown overlay={menu} trigger={['click']}>
                    <Avatar size={40} icon={<UserOutlined />} />
                </Dropdown>
            </div>
        </nav>
    );
};

export default Navbar;

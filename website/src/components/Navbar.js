import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Dropdown, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import './navbarstyle.css'; // Import the navbar styles
import ptit from "../assets/ptit.jpg";
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
        <nav className="navbar">
            <div
                className="navbar-title"
                onClick={handleTitleClick} // Add click handler for title
            >
                <img src={ptit} alt="logo" className='h-12'/>
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

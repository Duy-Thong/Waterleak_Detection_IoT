import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, onValue } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { Menu, Dropdown, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import './navbarstyle.css'; // Import the navbar styles
import ptit from "../assets/ptit.jpg";

const Navbar = ({ onLogout }) => {
    const navigate = useNavigate();
    const [photoURL, setPhotoURL] = useState(null);
    const auth = getAuth();
    const db = getDatabase();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                // Fetch photoURL from Realtime Database
                const userRef = ref(db, `users/${user.uid}/photoURL`);
                onValue(userRef, (snapshot) => {
                    const photoURLFromDB = snapshot.val();
                    if (photoURLFromDB) {
                        setPhotoURL(photoURLFromDB);
                    }
                });
            }
        });

        // Cleanup subscription
        return () => unsubscribe();
    }, []);

    const handleAccountManagement = () => {
        navigate('/account-management');
    };

    const handleLogout = () => {
        localStorage.removeItem('userId'); // Remove userId from localStorage
        setPhotoURL(null); // Reset photoURL when logging out
        onLogout();
        navigate('/login');
    };

    const handleTitleClick = () => {
        navigate('/home'); // Navigate to /home
    };

    const menuStyle = {
        width: '220px',
        background: 'rgba(255, 255, 255, 0.25)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        borderRadius: '10px',
        padding: '8px'
    };

    const menuItemStyle = {
        fontSize: '16px',
        padding: '12px 20px',
        borderRadius: '8px',
        margin: '4px 0',
        color: '#2c3e50',
        transition: 'all 0.3s ease',
        ':hover': {
            background: 'rgba(255, 255, 255, 0.4)',
            transform: 'translateX(5px)'
        }
    };

    const menu = (
        <Menu style={menuStyle}>
            <Menu.Item key="1" onClick={handleAccountManagement} style={menuItemStyle}>
                Quản lý tài khoản
            </Menu.Item>
            <Menu.Item key="2" onClick={handleLogout} style={menuItemStyle}>
                Đăng xuất
            </Menu.Item>
        </Menu>
    );

    return (
        <nav className="navbar glassmorphism">
            <div
                className="navbar-title"
                onClick={handleTitleClick} // Add click handler for title
            >
                <img src={ptit} alt="logo" className='h-12'/>
            </div>
            <div>
                <Dropdown overlay={menu} trigger={['click']}>
                    <Avatar 
                        size={48} 
                        icon={<UserOutlined />}
                        src={photoURL}
                        style={{ cursor: 'pointer' }}
                    />
                </Dropdown>
            </div>
        </nav>
    );
};

export default Navbar;

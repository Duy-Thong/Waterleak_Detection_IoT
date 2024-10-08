import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get, update } from "firebase/database";
import { useUser } from '../contexts/UserContext';
import Navbar from './Navbar';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, Alert, Spin } from 'antd';

const { Title } = Typography;

const AccountManagement = () => {
    const { userId, logout } = useUser();
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showChangePassword, setShowChangePassword] = useState(false); // State to toggle password form
    const [currentPassword, setCurrentPassword] = useState(''); // State for current password
    const [newPassword, setNewPassword] = useState(''); // State for new password
    const [confirmPassword, setConfirmPassword] = useState(''); // State for confirm new password
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserData = async () => {
            const db = getDatabase();
            const userRef = ref(db, 'users/' + userId);
            try {
                const snapshot = await get(userRef);
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    setUsername(userData.username || '');
                } else {
                    setError('User data not found');
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
                setError('Error fetching user data');
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchUserData();
        }
    }, [userId]);

    const handleUpdate = async (values) => {
        const db = getDatabase();
        const userRef = ref(db, 'users/' + userId);

        try {
            // Proceed with updating user data (only username)
            const updates = {
                username,
            };

            await update(userRef, updates);
            alert('Account information updated successfully.');
        } catch (error) {
            console.error("Error updating user data:", error);
            alert('Error updating account information.');
        }
    };

    const handleChangePassword = async () => {
        const db = getDatabase();
        const userRef = ref(db, 'users/' + userId);

        try {
            const snapshot = await get(userRef);
            const userData = snapshot.val();

            // Check if the current password is correct
            if (userData.password !== currentPassword) {
                setError('Mật khẩu cũ không chính xác');
                return;
            }

            // Check if new passwords match
            if (newPassword !== confirmPassword) {
                setError('Mật khẩu mới không khớp');
                return;
            }

            // Update password
            const updates = {
                password: newPassword,
            };

            await update(userRef, updates);
            alert('Password updated successfully.');
            setShowChangePassword(false); // Hide the change password form
            setCurrentPassword(''); // Clear fields after update
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error("Error updating password:", error);
            alert('Error updating password.');
        }
    };

    const handleLogout = () => {
        logout();
        window.location.href = '/login'; // Redirect to login page after logout
    };

    if (loading) {
        return <Spin size="large" />;
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
            <Navbar onLogout={handleLogout} />
            <div className="flex flex-col items-center justify-center flex-1 p-4 md:p-8">
                <Title level={2}>Quản lý tài khoản</Title>

                {error && <Alert message={error} type="error" showIcon />}

                <Form
                    onFinish={handleUpdate}
                    layout="vertical"
                    className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-lg"
                >
                    <Form.Item label="Tên đăng nhập" required>
                        <Input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </Form.Item>

                    <Form.Item>
                        <div className="flex justify-center">
                            <Button
                                type="primary"
                                htmlType="submit"
                                className="mr-4"
                            >
                                Cập nhật thông tin
                            </Button>
                            <Button
                                onClick={() => navigate('/home')}
                            >
                                Quay lại trang chủ
                            </Button>
                        </div>
                    </Form.Item>
                </Form>

                {/* Change Password Section */}
                <Button
                    type="default"
                    onClick={() => setShowChangePassword(!showChangePassword)} // Toggle password form
                    className="mt-4"
                >
                    {showChangePassword ? 'Hủy đổi mật khẩu' : 'Đổi mật khẩu'}
                </Button>

                {showChangePassword && (
                    <Form
                        layout="vertical"
                        className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-lg mt-4"
                        onFinish={handleChangePassword}
                    >
                        <Form.Item label="Mật khẩu cũ" required>
                            <Input.Password
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                        </Form.Item>

                        <Form.Item label="Mật khẩu mới" required>
                            <Input.Password
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </Form.Item>

                        <Form.Item label="Xác nhận mật khẩu mới" required>
                            <Input.Password
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </Form.Item>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                className="mr-4"
                            >
                                Cập nhật mật khẩu
                            </Button>
                        </Form.Item>
                    </Form>
                )}
            </div>
        </div>
    );
};

export default AccountManagement;

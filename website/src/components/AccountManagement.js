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
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
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

    const checkUsernameExists = async (newUsername) => {
        const db = getDatabase();
        const usersRef = ref(db, 'users');
        try {
            const snapshot = await get(usersRef);
            if (snapshot.exists()) {
                const users = snapshot.val();
                // Check if the new username exists in the database
                return Object.values(users).some(user => user.username === newUsername && user.id !== userId);
            }
            return false;
        } catch (error) {
            console.error("Error checking username:", error);
            return false;
        }
    };

    const isPasswordStrong = (password) => {
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
        return strongPasswordRegex.test(password);
    };

    const handleUpdate = async (values) => {
        const newUsername = username;
        const usernameExists = await checkUsernameExists(newUsername);

        if (usernameExists) {
            setError('Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.');
            return; // Prevent update
        }

        const db = getDatabase();
        const userRef = ref(db, 'users/' + userId);

        try {
            const updates = {
                username: newUsername,
            };

            await update(userRef, updates);
            alert('Thông tin tài khoản đã được cập nhật thành công.');
        } catch (error) {
            console.error("Error updating user data:", error);
            alert('Lỗi khi cập nhật thông tin tài khoản.');
        }
    };

    const handleChangePassword = async () => {
        const db = getDatabase();
        const userRef = ref(db, 'users/' + userId);

        try {
            const snapshot = await get(userRef);
            const userData = snapshot.val();

            if (userData.password !== currentPassword) {
                setError('Mật khẩu cũ không chính xác');
                return;
            }

            if (newPassword !== confirmPassword) {
                setError('Mật khẩu mới không khớp');
                return;
            }

            if (!isPasswordStrong(newPassword)) {
                setError('Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.');
                return; // Prevent update
            }

            const updates = {
                password: newPassword,
            };

            await update(userRef, updates);
            alert('Mật khẩu đã được cập nhật thành công.');
            setShowChangePassword(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error("Error updating password:", error);
            alert('Lỗi khi cập nhật mật khẩu.');
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
                    onClick={() => setShowChangePassword(!showChangePassword)}
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

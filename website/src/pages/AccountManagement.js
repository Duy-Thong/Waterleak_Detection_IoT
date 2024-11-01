import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get, update } from "firebase/database";
import { getAuth, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "firebase/auth";
import { useUser } from '../contexts/UserContext';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, Alert, notification } from 'antd';
import RequireLogin from './RequireLogin';
import "./style.css";
const { Title } = Typography;

const openNotificationWithIcon = (type, message) => {
    notification[type]({
        message: message,
    });
};

const AccountManagement = () => {
    const { userId, logout } = useUser();
    const [currentUsername, setCurrentUsername] = useState('');
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
            const auth = getAuth();
            const currentUser = auth.currentUser;

            try {
                const snapshot = await get(userRef);
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    setUsername(userData.username || '');
                    setCurrentUsername(userData.username || '');
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

    const checkUsernameExists = async (username) => {
        if (username === currentUsername) {
            return false;
        }
        const db = getDatabase();
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);
        let exists = false;
        snapshot.forEach((childSnapshot) => {
            const userData = childSnapshot.val();
            if (userData.username === username && childSnapshot.key !== userId) {
                exists = true;
            }
        });
        return exists;
    };

    const isPasswordStrong = (password) => {
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*.])[A-Za-z\d!@#$%^&*.]{8,}$/;
        return strongPasswordRegex.test(password.trim());
    };

    const handleUpdate = async (values) => {
        const newUsername = username;
        const auth = getAuth();

        setError(''); // Clear error at the start of an update attempt

        const usernameExists = await checkUsernameExists(newUsername);

        if (usernameExists) {
            setError('Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.');
            return;
        }

        const db = getDatabase();
        const userRef = ref(db, 'users/' + userId);

        try {
            const updates = {
                username: newUsername
            };
            await update(userRef, updates);
            openNotificationWithIcon('success', 'Thông tin tài khoản đã được cập nhật thành công.');
            setError(''); // Clear error after success
        } catch (error) {
            console.error("Error updating user data:", error);
            openNotificationWithIcon('error', `Lỗi khi cập nhật thông tin tài khoản: ${error.message}`);
        }
    };

    const handleChangePassword = async () => {
        const db = getDatabase();
        const userRef = ref(db, 'users/' + userId);
        const auth = getAuth();
        const currentUser = auth.currentUser;

        try {
            const snapshot = await get(userRef);
            const userData = snapshot.val();

            // Check if current password is correct
            if (userData.password !== currentPassword) {
                setError('Mật khẩu cũ không chính xác');
                return;
            }

            // Check if new passwords match
            if (newPassword !== confirmPassword) {
                setError('Mật khẩu mới không khớp');
                return;
            }

            // Check password strength
            if (!isPasswordStrong(newPassword)) {
                setError('Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.');
                return;
            }

            // Reauthenticate the user
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(currentUser, credential);

            // Update password in Firebase Authentication
            await updatePassword(currentUser, newPassword);

            // Update password in Realtime Database
            const updates = { password: newPassword };
            await update(userRef, updates);

            openNotificationWithIcon('success', 'Mật khẩu đã được cập nhật thành công.');
            setShowChangePassword(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error("Error updating password:", error);
            openNotificationWithIcon('error', 'Lỗi khi cập nhật mật khẩu: ' + error.message);
        }
    };

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    if (!userId) {
        return <RequireLogin />;
    }

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-t from-white to-blue-300">
            <Navbar onLogout={handleLogout} />
            <div className="flex flex-col items-center justify-center flex-1 p-4 md:p-8 mt-16">
                <Title level={2} className='!text-white'>Quản lý tài khoản</Title>

                {error && <Alert message={error} type="error" showIcon />}

                <Form
                    onFinish={handleUpdate}
                    layout="vertical"
                    className="glassmorphism glassmorphism-filter-section w-full max-w-lg p-4"
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
                        className="glassmorphism glassmorphism-filter-section w-full max-w-lg mt-4 p-4"
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
                            <div className="flex justify-center">
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                >
                                    Cập nhật mật khẩu
                                </Button>
                            </div>
                        </Form.Item>
                    </Form>
                )}
            </div>
        </div>
    );
};

export default AccountManagement;

import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get, update } from "firebase/database";
import { getAuth, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "firebase/auth";
import { put } from '@vercel/blob';
import { useUser } from '../contexts/UserContext';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, notification } from 'antd';
import RequireLogin from '../components/RequireLogin';
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
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isGoogleUser, setIsGoogleUser] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserData = async () => {
            const db = getDatabase();
            const userRef = ref(db, 'users/' + userId);
            const auth = getAuth();
            const currentUser = auth.currentUser;

            // Check if user is Google-authenticated
            if (currentUser) {
                const providers = currentUser.providerData.map(provider => provider.providerId);
                setIsGoogleUser(providers.includes('google.com'));
            }

            try {
                const snapshot = await get(userRef);
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    setUsername(userData.username || '');
                    setCurrentUsername(userData.username || '');
                    setAvatarUrl(userData.photoURL || '');
                } else {
                    openNotificationWithIcon('error', 'Không tìm thấy thông tin người dùng');
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
                openNotificationWithIcon('error', 'Lỗi khi tải thông tin người dùng');
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
        const newUsername = username.trim(); // Trim whitespace
        const auth = getAuth();

        // Check for empty username
        if (!newUsername) {
            openNotificationWithIcon('error', 'Tên đăng nhập không được để trống');
            return;
        }

        const usernameExists = await checkUsernameExists(newUsername);

        if (usernameExists) {
            openNotificationWithIcon('error', 'Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác');
            return;
        }

        const db = getDatabase();
        const userRef = ref(db, 'users/' + userId);

        try {
            const updates = {
                username: newUsername
            };
            await update(userRef, updates);
            openNotificationWithIcon('success', 'Thông tin tài khoản đã được cập nhật thành công');
        } catch (error) {
            console.error("Error updating user data:", error);
            openNotificationWithIcon('error', `Lỗi khi cập nhật thông tin tài khoản: ${error.message}`);
        }
    };

    const handleChangePassword = async () => {
        const auth = getAuth();
        const currentUser = auth.currentUser;

        try {
            // Check if new passwords match
            if (newPassword !== confirmPassword) {
                openNotificationWithIcon('error', 'Mật khẩu mới không khớp');
                return;
            }

            // Check password strength
            if (!isPasswordStrong(newPassword)) {
                openNotificationWithIcon('error', 'Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt');
                return;
            }

            // Verify old password by reauthenticating
            const credential = EmailAuthProvider.credential(
                currentUser.email,
                currentPassword
            );
            
            try {
                await reauthenticateWithCredential(currentUser, credential);
            } catch (error) {
                openNotificationWithIcon('error', 'Mật khẩu cũ không chính xác');
                return;
            }

            // Update password in Firebase Authentication
            await updatePassword(currentUser, newPassword);

            openNotificationWithIcon('success', 'Mật khẩu đã được cập nhật thành công');
            setShowChangePassword(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error("Error updating password:", error);
            openNotificationWithIcon('error', 'Lỗi khi cập nhật mật khẩu: ' + error.message);
        }
    };

    const handleAvatarUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!validImageTypes.includes(file.type)) {
            openNotificationWithIcon('error', 'Vui lòng chọn file ảnh (JPEG, PNG, GIF)');
            return;
        }

        setUploading(true);
        try {
            // Upload to Vercel Blob
            const blob = await put(`avatars/${userId}-${file.name}`, file, {
                access: 'public',
                token: "vercel_blob_rw_vuBTDxs1Af4OyipF_7ktfANNunJPJCY1OsqLo4fevvrPM6A" // Direct token for testing
            });


            const downloadUrl = blob.url;
            
            // Update user profile in Firebase Database
            const db = getDatabase();
            const userRef = ref(db, 'users/' + userId);
            await update(userRef, {
                photoURL: downloadUrl
            });

            setAvatarUrl(downloadUrl);
            openNotificationWithIcon('success', 'Ảnh đại diện đã được cập nhật');
        } catch (error) {
            console.error("Error uploading avatar:", error);
            openNotificationWithIcon('error', 'Lỗi khi tải lên ảnh đại diện');
        } finally {
            setUploading(false);
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

                <div className="glassmorphism glassmorphism-filter-section w-full max-w-lg p-4 mb-4">
                    <div className="flex flex-col items-center mb-4">
                        <div className="w-32 h-32 rounded-full overflow-hidden mb-4 bg-gray-200">
                            <img
                                src={avatarUrl || 'https://via.placeholder.com/128'}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                            id="avatar-upload"
                        />
                        <label
                            htmlFor="avatar-upload"
                            className="cursor-pointer bg-white text-blue-500 border border-blue-500 px-4 py-2 rounded hover:text-blue-600 hover:border-blue-600"
                        >
                            {uploading ? 'Đang tải...' : 'Thay đổi ảnh đại diện'}
                        </label>
                    </div>
                </div>

                <Form
                    onFinish={handleUpdate}
                    layout="vertical"
                    className="glassmorphism glassmorphism-filter-section w-full max-w-lg p-4"
                >
                    <Form.Item 
                        label="Tên đăng nhập" 
                        required
                        rules={[
                            {
                                required: true,
                                message: 'Vui lòng nhập tên đăng nhập!'
                            }
                        ]}
                    >
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
                                className="mr-4 !bg-white !text-blue-500 !border-blue-500 hover:!text-blue-600 hover:!border-blue-600"
                            >
                                Cập nhật thông tin
                            </Button>
                            <Button
                                className="!bg-white !text-gray-500 !border-gray-500 hover:!text-gray-600 hover:!border-gray-600"
                                onClick={() => navigate('/home')}
                            >
                                Quay lại trang chủ
                            </Button>
                        </div>
                    </Form.Item>
                </Form>

                {/* Change Password Section - Only show for non-Google users */}
                {!isGoogleUser && (
                    <>
                        <Button
                            type="default"
                            onClick={() => setShowChangePassword(!showChangePassword)}
                            className="mt-4 !bg-white !text-blue-500 !border-blue-500 hover:!text-blue-600 hover:!border-blue-600"
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
                                            className="!bg-white !text-blue-500 !border-blue-500 hover:!text-blue-600 hover:!border-blue-600"
                                        >
                                            Cập nhật mật khẩu
                                        </Button>
                                    </div>
                                </Form.Item>
                            </Form>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AccountManagement;

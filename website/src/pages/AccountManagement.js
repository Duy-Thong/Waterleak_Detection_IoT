import React, { useState, useEffect, useCallback } from 'react';
import { getDatabase, ref, get, update } from "firebase/database";
import { getAuth, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "firebase/auth";
import { put } from '@vercel/blob';
import { useUser } from '../contexts/UserContext';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, notification, Modal } from 'antd';
import RequireLogin from '../components/RequireLogin';
import { CameraFilled, MailOutlined } from '@ant-design/icons'; // Remove GoogleOutlined
import Cropper from 'react-easy-crop' // Add this import
import "./style.css";

const { Title } = Typography;

// Add Google Icon Component
const GoogleIcon = () => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 48 48" 
        width="16" 
        height="16"
    >
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
);

// Add ImageCropModal component
const ImageCropModal = ({ image, visible, onCancel, onCropComplete }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const createImage = (url) =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.src = url;
        });

    const getCroppedImg = async (imageSrc, pixelCrop) => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const maxSize = Math.max(image.width, image.height);
        const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

        canvas.width = safeArea;
        canvas.height = safeArea;

        ctx.translate(safeArea / 2, safeArea / 2);
        ctx.translate(-safeArea / 2, -safeArea / 2);

        ctx.drawImage(
            image,
            safeArea / 2 - image.width * 0.5,
            safeArea / 2 - image.height * 0.5
        );

        const data = ctx.getImageData(0, 0, safeArea, safeArea);

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.putImageData(
            data,
            Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
            Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
        );

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg');
        });
    };

    const onCropAreaComplete = useCallback(async (_, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        try {
            if (!croppedAreaPixels) return;
            const croppedImage = await getCroppedImg(image, croppedAreaPixels);
            onCropComplete(croppedImage);
        } catch (e) {
            console.error('Error cropping image:', e);
            notification.error({ message: 'Lỗi khi cắt ảnh' });
        }
    };

    return (
        <Modal
            visible={visible}
            onCancel={onCancel}
            title="Cắt ảnh đại diện"
            okText="Xác nhận"
            cancelText="Hủy"
            onOk={handleSave}
            width={520}
            centered
        >
            <div style={{ position: 'relative', height: 400, background: '#333' }}>
                <Cropper
                    image={image}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropAreaComplete}
                    cropShape="round"
                    showGrid={false}
                />
            </div>
            <div className="text-center text-sm text-gray-500 mt-2">
                Kéo để di chuyển, cuộn chuột để phóng to/thu nhỏ
            </div>
        </Modal>
    );
};

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
    const [email, setEmail] = useState('');
    const [createdAt, setCreatedAt] = useState('');
    const [registrationMethod, setRegistrationMethod] = useState('');
    const [cropModalVisible, setCropModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
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
                setEmail(currentUser.email);
                // Convert timestamp to date string
                const createdAtDate = new Date(currentUser.metadata.creationTime);
                setCreatedAt(createdAtDate.toLocaleDateString('vi-VN'));
                setRegistrationMethod(providers[0]); // Get the first provider as registration method
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

    const handleAvatarUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!validImageTypes.includes(file.type)) {
            openNotificationWithIcon('error', 'Vui lòng chọn file ảnh (JPEG, PNG, GIF)');
            return;
        }

        // Create URL for preview
        const reader = new FileReader();
        reader.onload = () => {
            setSelectedImage(reader.result);
            setCropModalVisible(true);
        };
        reader.readAsDataURL(file);
    };

    const handleCroppedImage = async (croppedBlob) => {
        setCropModalVisible(false);
        setUploading(true);

        try {
            // Upload to Vercel Blob
            const blob = await put(`avatars/${userId}-${Date.now()}.jpg`, croppedBlob, {
                access: 'public',
                token: "vercel_blob_rw_vuBTDxs1Af4OyipF_7ktfANNunJPJCY1OsqLo4fevvrPM6A"
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
                        <div className="w-24 h-24 overflow-visible mb-4 relative">
                            <img
                                src={avatarUrl || 'https://via.placeholder.com/128'}
                                alt="Avatar"
                                className="w-full h-full object-cover rounded-full"
                            />
                            <label
                                htmlFor="avatar-upload"
                                className="absolute bottom-0 right-0 bg-white text-blue-500 border border-blue-500 rounded-full w-6 h-6 flex items-center justify-center cursor-pointer hover:text-blue-600 hover:border-blue-600 z-20"
                            >
                                <CameraFilled style={{ fontSize: '12px' }} />
                            </label>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                            id="avatar-upload"
                        />
                        
                        {/* User Info Section */}
                        <div className="w-full grid grid-cols-1 gap-3 mt-4">
                            <div className="flex flex-col items-center">
                                <span className="text-gray-500">Email</span>
                                <span className="font-medium">{email}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-gray-500">Ngày đăng ký</span>
                                <span className="font-medium">{createdAt}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-gray-500">Phương thức đăng ký</span>
                                <div className="flex items-center">
                                    {registrationMethod === 'google.com' ? (
                                        <>
                                            <div className="mr-2">
                                                <GoogleIcon />
                                            </div>
                                            <span className="font-medium">Google</span>
                                        </>
                                    ) : (
                                        <>
                                            <MailOutlined className="text-blue-500 mr-2" />
                                            <span className="font-medium">Email</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
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
            {/* Add ImageCropModal */}
            <ImageCropModal
                visible={cropModalVisible}
                image={selectedImage}
                onCancel={() => setCropModalVisible(false)}
                onCropComplete={handleCroppedImage}
            />
        </div>
    );
};

export default AccountManagement;

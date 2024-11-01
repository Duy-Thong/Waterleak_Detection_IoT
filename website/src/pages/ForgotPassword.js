import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, Alert } from 'antd';
import { getAuth, sendPasswordResetEmail } from "firebase/auth"; // Import Firebase Auth
import login from '../assets/login.jpg';
import forgot from '../assets/forgot.jpg';

const ForgotPassword = () => {
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (values) => {
        setError("");
        setSuccess(false);
        setLoading(true);

        const { email } = values;

        const auth = getAuth();
        try {
            await sendPasswordResetEmail(auth, email);
            setSuccess(true);
        } catch (error) {
            console.error("Error sending password reset email:", error);
            setError("Có lỗi xảy ra. Vui lòng kiểm tra lại địa chỉ email của bạn.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setIsVisible(true);
    }, []);

    return (
        <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-200 ${isVisible ? 'fade-in' : ''}`}>
            <div className="bg-white shadow-xl rounded-lg flex w-3/4 max-w-4xl overflow-hidden backdrop-blur-sm bg-opacity-80 border-gray-200">
                <div className="hidden md:block w-1/2 bg-white flex items-center justify-center">
                    <img
                        src={forgot}
                        alt="Illustration"
                        className="w-full h-full object-cover max-w-2xl"
                    />
                </div>
                <div className="w-full md:w-1/2 p-8">
                    <h2 className="text-2xl font-bold text-center text-gray-700">Quên mật khẩu</h2>
                    {error && <Alert message={error} type="error" showIcon className="mb-4" />}
                    {success && <Alert message="Đã gửi email yêu cầu đặt lại mật khẩu." type="success" showIcon className="mb-4" />}
                    <Form onFinish={handleSubmit} layout="vertical">
                        <Form.Item
                            label="Tên người dùng"
                            name="email"
                            rules={[{ required: true, type: 'email', message: 'Vui lòng nhập địa chỉ email hợp lệ.' }]}
                        >
                            <Input placeholder="Nhập địa chỉ email của bạn" />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" className="w-full" loading={loading}>
                                Gửi email đặt lại mật khẩu
                            </Button>
                        </Form.Item>
                    </Form>
                    <p className="mt-4 text-center text-sm text-gray-600">
                        Quay lại{" "}
                        <Button type="link" onClick={() => navigate("/login")}>
                            Đăng nhập
                        </Button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;

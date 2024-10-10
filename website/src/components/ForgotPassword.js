import { useState, useEffect } from "react"; // Import useEffect
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, Alert } from 'antd'; // Import Ant Design components
import emailjs from 'emailjs-com'; // Import EmailJS
import login from '../assets/login.jpg'; // Optional: Use for illustration on the left
import forgot from '../assets/forgot.jpg'; // Optional: Use for illustration on the left
const ForgotPassword = () => {
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false); // Added loading state
    const [isVisible, setIsVisible] = useState(false); // State for visibility
    const navigate = useNavigate();

    const handleSubmit = async (values) => {
        setError(""); // Clear previous errors
        setSuccess(false); // Reset success state
        setLoading(true); // Start loading

        const { email, newPassword, confirmPassword } = values; // Destructure values

        // Kiểm tra xác nhận mật khẩu
        if (newPassword !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp.");
            setLoading(false); // Stop loading
            return;
        }
        try {
            const templateParams = {
                user_email: email, // Ensure this matches the template placeholder
                user_newPassword: newPassword, // Ensure this matches the template placeholder
            };

            await emailjs.send('service_qy5jnnk', 'template_r6aj2sh', templateParams, '6514CWFzELzPia5Wd');
            setSuccess(true); // Đặt thành công
        } catch (error) {
            console.error("Lỗi khi gửi email:", error);
            setError("Có lỗi xảy ra. Vui lòng kiểm tra lại địa chỉ email của bạn.");
        } finally {
            setLoading(false); // Stop loading in either case
        }
    };

    // Set the visibility of the component to trigger fade-in animation
    useEffect(() => {
        setIsVisible(true);
    }, []);

    return (
        <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-200 ${isVisible ? 'fade-in' : ''}`}>
            <div className="bg-white shadow-xl rounded-lg flex w-3/4 max-w-4xl overflow-hidden backdrop-blur-sm bg-opacity-80 border-gray-200">
                {/* Left side with illustration */}
                <div className="hidden md:block w-1/2 bg-white flex items-center justify-center">
                    <img
                        src={forgot} // Replace with your illustration URL
                        alt="Illustration"
                        className="w-full h-full object-cover max-w-2xl"
                    />
                </div>

                {/* Right side with form */}
                <div className="w-full md:w-1/2 p-8">
                    <h2 className="text-2xl font-bold text-center text-gray-700">Quên mật khẩu</h2>

                    {/* Hiển thị thông báo lỗi */}
                    {error && <Alert message={error} type="error" showIcon className="mb-4" />}

                    {/* Hiển thị thông báo thành công */}
                    {success && <Alert message="Đã gửi email yêu cầu đặt lại mật khẩu." type="success" showIcon className="mb-4" />}

                    {/* Form với Ant Design */}
                    <Form onFinish={handleSubmit} layout="vertical">
                        <Form.Item
                            label="Tên người dùng"
                            name="email"
                            rules={[{ required: true, type: 'text', message: 'Vui lòng nhập địa chỉ email hợp lệ.' }]}
                        >
                            <Input placeholder="Nhập địa chỉ email của bạn" />
                        </Form.Item>

                        <Form.Item
                            label="Mật khẩu mới"
                            name="newPassword"
                            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu mới.' }]}
                        >
                            <Input.Password placeholder="Nhập mật khẩu mới" />
                        </Form.Item>

                        <Form.Item
                            label="Xác nhận mật khẩu mới"
                            name="confirmPassword"
                            rules={[{ required: true, message: 'Vui lòng xác nhận mật khẩu mới.' }]}
                        >
                            <Input.Password placeholder="Xác nhận mật khẩu mới" />
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

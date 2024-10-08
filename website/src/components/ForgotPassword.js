import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, Alert } from 'antd'; // Import Ant Design components
import emailjs from 'emailjs-com'; // Import EmailJS

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (values) => {
        setError(""); // Clear previous errors
        setSuccess(false); // Reset success state

        // Gửi email reset mật khẩu bằng EmailJS
        try {
            const templateParams = {
                email: values.email,
                message: 'Vui lòng nhấp vào liên kết sau để đặt lại mật khẩu của bạn: [LINK_HERE]', // Thay thế bằng liên kết đặt lại mật khẩu của bạn
            };

            await emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', templateParams, 'YOUR_USER_ID');
            setSuccess(true); // Đặt thành công
        } catch (error) {
            console.error("Lỗi khi gửi email:", error);
            setError("Có lỗi xảy ra. Vui lòng kiểm tra lại địa chỉ email của bạn.");
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-md rounded-lg">
                <h2 className="text-2xl font-bold text-center text-gray-700">Quên mật khẩu</h2>

                {/* Hiển thị thông báo lỗi */}
                {error && <Alert message={error} type="error" showIcon className="mb-4" />}

                {/* Hiển thị thông báo thành công */}
                {success && <Alert message="Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư đến của bạn." type="success" showIcon className="mb-4" />}

                {/* Form với Ant Design */}
                <Form
                    onFinish={handleSubmit}
                    layout="vertical"
                >
                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[{ required: true, type: 'email', message: 'Vui lòng nhập địa chỉ email hợp lệ.' }]}
                    >
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Nhập địa chỉ email của bạn"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" className="w-full">
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
    );
};

export default ForgotPassword;

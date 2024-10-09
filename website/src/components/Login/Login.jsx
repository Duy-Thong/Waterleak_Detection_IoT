import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { database } from "../../firebase";
import { useUser } from '../../contexts/UserContext';
import { Form, Input, Button, Alert, Spin } from 'antd';

function Login() {
  const [error, setError] = useState(""); 
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUserId } = useUser();

  const handleSubmit = async (values) => {
    setError(""); 
    setLoading(true);

    const usersRef = ref(database, 'users');
    try {
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        let isValid = false;
        let currentUserId = null;

        snapshot.forEach((childSnapshot) => {
          const userData = childSnapshot.val();
          if (
            userData.username === values.username &&
            userData.password === values.password
          ) {
            isValid = true;
            currentUserId = childSnapshot.key;
          }
        });

        if (isValid) {
          setUserId(currentUserId);
          localStorage.setItem('userId', currentUserId); // Lưu userId vào localStorage
          navigate("/home");
        } else {
          setError("Tên đăng nhập hoặc mật khẩu không đúng!");
        }
      } else {
        setError("Không tìm thấy người dùng!");
      }
    } catch (error) {
      console.error("Lỗi khi kiểm tra đăng nhập:", error);
      setError("Có lỗi xảy ra khi đăng nhập.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate("/forgot-password");
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-md rounded-lg">
        <h2 className="text-2xl font-bold text-center text-gray-700">Đăng nhập</h2>

        {error && <Alert message={error} type="error" showIcon className="mb-4" />}

        <Form
          onFinish={handleSubmit}
          layout="vertical"
        >
          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: 'Please enter your username' }]}
          >
            <Input placeholder="Enter your username" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password placeholder="Enter your password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" className="w-full" loading={loading}>
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>

        <div className="mt-4 text-center">
          <Button type="link" onClick={handleForgotPassword}>
            Quên mật khẩu?
          </Button>
        </div>

        <p className="mt-4 text-center text-sm text-gray-600">
          Chưa có tài khoản?{" "}
          <Button type="link" onClick={() => navigate("/register")}>
            Đăng ký
          </Button>
        </p>
      </div>
    </div>
  );
}

export default Login;
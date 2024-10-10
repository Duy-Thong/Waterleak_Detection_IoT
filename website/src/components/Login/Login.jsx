import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { database } from "../../firebase";
import { useUser } from '../../contexts/UserContext';
import { Form, Input, Button, Alert } from 'antd';
import PTIT from '../../assets/ptit.jpg';
import login from '../../assets/login.jpg';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-200">
      <div className="bg-white shadow-xl rounded-lg flex w-3/4 max-w-4xl overflow-hidden backdrop-blur-sm bg-opacity-80  border-gray-200">
        
        {/* Left side with illustration */}
        <div className="hidden md:block w-1/2 bg-purple-500 flex items-center justify-center">
          <img
            src={login} // Replace with your illustration URL
            alt="Illustration"
            className="w-full h-full object-cover max-w-2xl"
          />
        </div>

        {/* Right side with login form */}
        <div className="w-full md:w-1/2 p-8">
          <h3 className="text-2xl font-bold text-center text-gray-700 mb-4">HỆ THỐNG PHÁT HIỆN VỠ ỐNG NƯỚC</h3>

          <h2 className="text-2xl font-bold text-center text-gray-700">Đăng nhập</h2>

          {error && <Alert message={error} type="error" showIcon className="mb-4" />}

          <Form
            onFinish={handleSubmit}
            layout="vertical"
          >
            <Form.Item
              label="Tên đăng nhập"
              name="username"
              rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
            >
              <Input placeholder="Nhập tên đăng nhập" />
            </Form.Item>

            <Form.Item
              label="Mật khẩu"
              name="password"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
            >
              <Input.Password placeholder="Nhập mật khẩu" />
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
    </div>
  );
}

export default Login;

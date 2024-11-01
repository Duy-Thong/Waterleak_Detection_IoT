import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, set, get, child } from "firebase/database"; // Import get and child
import { createUserWithEmailAndPassword } from "firebase/auth";
import { database, auth } from "../../firebase"; // Import auth from firebase config
import { Form, Input, Button, Alert, Progress } from 'antd'; 
import { useUser } from '../../contexts/UserContext';
import register from '../../assets/register.jpg';

function Register() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "", 
  });
  const [passwordStrength, setPasswordStrength] = useState(""); 
  const [strengthPercent, setStrengthPercent] = useState(0); 
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUserId } = useUser();

  const calculateStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 30;
    if (/[a-z]/.test(password)) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/\d/.test(password)) strength += 15;
    if (/[!@#$%^&*]/.test(password)) strength += 15;
    return strength;
  };

  const isPasswordStrong = (password) => {
        // Updated regex to include the period (.)
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*.])[A-Za-z\d!@#$%^&*.]{8,}$/;
        return strongPasswordRegex.test(password.trim());
    };

  const handlePasswordChange = (password) => {
    setFormData({ ...formData, password });
    
    const strength = calculateStrength(password);
    setStrengthPercent(strength);

    if (strength > 70) {
      setPasswordStrength("Mật khẩu mạnh");
    } else if (strength > 40) {
      setPasswordStrength("Mật khẩu trung bình");
    } else {
      setPasswordStrength("Mật khẩu yếu. Vui lòng kiểm tra lại.");
    }
  };

  const checkDuplicate = async (username, email) => {
    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, `users`));
    if (snapshot.exists()) {
      const users = snapshot.val();
      for (let userId in users) {
        if (users[userId].username === username) {
          return "Tên người dùng đã tồn tại.";
        }
        if (users[userId].email === email) {
          return "Email đã tồn tại.";
        }
      }
    }
    return null;
  };

  const handleSubmit = async (values) => {
    setError(""); 
    setLoading(true);
    
    if (!isPasswordStrong(values.password)) {
      setError("Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.");
      setLoading(false);
      return;
    }

    const duplicateError = await checkDuplicate(values.username, values.email);
    if (duplicateError) {
      setError(duplicateError);
      setLoading(false);
      return;
    }

    try {
      // Step 1: Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      const userId = user.uid;

      // Step 2: Store user details in Realtime Database  
      const newUserRef = ref(database, `users/${userId}`);
      await set(newUserRef, {
        username: values.username,
        email: values.email,
        password: values.password // Thêm password vào database
      });
      setUserId(userId);
      localStorage.setItem('userId', userId);
      navigate('/home');

    } catch (error) {
      console.error("Registration error:", error);
      setError("Đã xảy ra lỗi khi đăng ký: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = () => {
    if (strengthPercent > 99) return "#3FCF3F"; // Green for strong password
    if (strengthPercent > 60) return "#FFC107"; // Yellow for medium password
    return "#FF3D3D"; // Red for weak password
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-200">
      <div className="bg-white shadow-xl rounded-lg flex w-3/4 max-w-4xl overflow-hidden backdrop-blur-sm bg-opacity-80 border-gray-200">
        
        {/* Left side with illustration */}
        <div className="hidden md:block w-1/2 bg-blue-500 flex items-center justify-center">
          <img
            src={register} 
            alt="Illustration"
            className="w-full h-full object-cover max-w-2xl"
          />
        </div>

        {/* Right side with registration form */}
        <div className="w-full md:w-1/2 p-8">
          <h2 className="text-2xl font-bold text-center text-gray-700">Đăng ký</h2>

          {error && <Alert message={error} type="error" showIcon className="mb-4" />}

          <Form
            onFinish={handleSubmit}
            layout="vertical"
          >
            <Form.Item
              label="Tên người dùng"
              name="username"
              rules={[{ required: true, message: 'Vui lòng nhập tên người dùng' }]}
            >
              <Input placeholder="Nhập tên người dùng" />
            </Form.Item>

            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Vui lòng nhập email' },
                { type: 'email', message: 'Vui lòng nhập email hợp lệ' },
              ]}
            >
              <Input placeholder="Nhập email" />
            </Form.Item>

            <Form.Item
              label="Mật khẩu"
              name="password"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
            >
              <Input.Password
                placeholder="Nhập mật khẩu"
                onChange={(e) => handlePasswordChange(e.target.value)}
              />
            </Form.Item>

            <div className="flex flex-col items-center">
              <Progress
                percent={strengthPercent}
                strokeColor={getProgressColor()}
                showInfo={false}
                className="mb-4 w-2/3"
              />
            </div>
            <Form.Item>
              <Button type="primary" htmlType="submit" className="w-full" loading={loading}>
                Đăng ký
              </Button>
            </Form.Item>
          </Form>

          <p className="mt-4 text-center text-sm text-gray-600">
            Đã có tài khoản?{" "}
            <Button type="link" onClick={() => navigate("/login")}>
              Đăng nhập
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;

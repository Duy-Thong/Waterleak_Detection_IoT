import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, push, set, get } from "firebase/database";
import { database } from "../../firebase";  
import { Form, Input, Button, Alert, Progress } from 'antd'; 
import { useUser } from '../../contexts/UserContext';
import register from '../../assets/register.jpg';
import ReCAPTCHA from "react-google-recaptcha"; // Import ReCAPTCHA

function Register() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [passwordStrength, setPasswordStrength] = useState(""); 
  const [strengthPercent, setStrengthPercent] = useState(0); 
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaValue, setCaptchaValue] = useState(null); // State to store CAPTCHA value
  const navigate = useNavigate();
  const { setUserId } = useUser();

  const checkUsernameExists = async (username) => {
    const usersRef = ref(database, 'users');
    try {
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const users = snapshot.val();
        const usernameExists = Object.values(users).some(user => user.username === username);
        return usernameExists;
      }
      return false;
    } catch (error) {
      console.error("Error checking username:", error);
      return false;
    }
  };

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
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    return strongPasswordRegex.test(password);
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

  const handleSubmit = async (values) => {
    setError(""); 
    setLoading(true);

    // Check if CAPTCHA is completed
    if (!captchaValue) {
      setError("Vui lòng xác minh rằng bạn không phải là robot.");
      setLoading(false);
      return;
    }

    const usernameExists = await checkUsernameExists(values.username);
    if (usernameExists) {
      setError("Tên người dùng đã tồn tại. Vui lòng chọn tên khác.");
      setLoading(false);
      return;
    }

    if (!isPasswordStrong(values.password)) {
      setError("Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.");
      setLoading(false);
      return;
    }

    const newUserRef = push(ref(database, 'users'));
    try {
      await set(newUserRef, {
        username: values.username,
        password: values.password,
      });
      console.log("User added with ID:", newUserRef.key);
      setUserId(newUserRef.key); // Set user ID in context
      localStorage.setItem('userId', newUserRef.key); // Save userId to localStorage
      navigate('/home'); 
    } catch (error) {
      console.error("Error saving data:", error);
      setError("Đã xảy ra lỗi khi lưu dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = () => {
    if (strengthPercent > 99) return "#3FCF3F"; // Green for strong password
    if (strengthPercent > 60) return "#FFC107"; // Yellow for medium password
    return "#FF3D3D"; // Red for weak password
  };

  const handleCaptchaChange = (value) => {
    setCaptchaValue(value); // Update CAPTCHA value on change
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-200">
      <div className="bg-white shadow-xl rounded-lg flex w-3/4 max-w-4xl overflow-hidden backdrop-blur-sm bg-opacity-80 border-gray-200">
        
        {/* Left side with illustration */}
        <div className="hidden md:block w-1/2 bg-blue-500 flex items-center justify-center">
          <img
            src={register} // Replace with your illustration URL
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

            {/* ReCAPTCHA component */}
            <ReCAPTCHA
              sitekey="6Ld1Zl0qAAAAAOZ3Hpy97baIusjKVEanlaqKV6PS" // Replace with your ReCAPTCHA site key
              onChange={handleCaptchaChange}
              className="mb-4"
            />

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

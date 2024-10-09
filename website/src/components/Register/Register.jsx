import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, push, set, get } from "firebase/database"; 
import { database } from "../../firebase";  
import { Form, Input, Button, message, Progress } from 'antd'; 

function Register() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [passwordStrength, setPasswordStrength] = useState(""); 
  const [strengthPercent, setStrengthPercent] = useState(0); 
  const navigate = useNavigate();

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
    if (password.length >= 8) strength += 30; // 30 points for length
    if (/[a-z]/.test(password)) strength += 20; // 20 points for lowercase letters
    if (/[A-Z]/.test(password)) strength += 20; // 20 points for uppercase letters
    if (/\d/.test(password)) strength += 15; // 15 points for numbers
    if (/[!@#$%^&*]/.test(password)) strength += 15; // 15 points for special characters
    return strength;
  };

  const isPasswordStrong = (password) => {
    const strength = calculateStrength(password);
    return strength > 70; // Password is strong if it has more than 70 points
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
    const usernameExists = await checkUsernameExists(values.username);
    if (usernameExists) {
      message.error("Tên người dùng đã tồn tại. Vui lòng chọn tên khác.");
      return;
    }

    if (!isPasswordStrong(values.password)) {
      message.error("Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.");
      return;
    }

    const newUserRef = push(ref(database, 'users'));
    try {
      await set(newUserRef, {
        username: values.username,
        password: values.password,
      });
      console.log("User added with ID:", newUserRef.key);
      message.success("Đăng ký thành công!");
      navigate('/login'); 
    } catch (error) {
      console.error("Error saving data:", error);
      message.error("Đã xảy ra lỗi khi lưu dữ liệu.");
    }
  };

  const getProgressColor = () => {
    if (strengthPercent > 70) return "#3FCF3F"; // Green for strong
    if (strengthPercent > 40) return "#FFC107"; // Yellow for medium
    return "#FF3D3D"; // Red for weak
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-md rounded-lg">
        <h2 className="text-2xl font-bold text-center text-gray-700">Đăng ký</h2>

        <Form
          onFinish={handleSubmit}
          layout="vertical"
          className="space-y-4"
          initialValues={{ username: formData.username, password: formData.password }}
        >
          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: 'Please enter your username' }]}
          >
            <Input
              placeholder="Enter your username"
              className="focus:ring focus:ring-green-200 focus:border-green-500"
            />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              placeholder="Enter your password"
              className="focus:ring focus:ring-green-200 focus:border-green-500"
              onChange={(e) => handlePasswordChange(e.target.value)}
            />
          </Form.Item>
          <div className="flex flex-col items-center">
          {/* <div className="text-gray-600">{passwordStrength}</div> */}

          <Progress
            percent={strengthPercent}
            strokeColor={getProgressColor()}
            showInfo={false}
            className="mb-4 w-2/3"
            />
          </div>
          <Form.Item>
            <Button type="primary" htmlType="submit" className="w-full bg-green-500 hover:bg-green-600">
              Đăng ký
            </Button>
          </Form.Item>
        </Form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Đã có tài khoản?{" "}
          <Button type="link" onClick={() => navigate("/login")} className="text-green-500 hover:underline">
            Quay lại đăng nhập
          </Button>
        </p>
      </div>
    </div>
  );
}

export default Register;

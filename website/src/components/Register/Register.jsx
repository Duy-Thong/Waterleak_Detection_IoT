import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, push, set, get } from "firebase/database"; // Import `get` to retrieve data
import { database } from "../../firebase";  // Import from Firebase config
import { Form, Input, Button, message } from 'antd'; // Import Ant Design components

function Register() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const navigate = useNavigate();

  const checkUsernameExists = async (username) => {
    const usersRef = ref(database, 'users');
    try {
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const users = snapshot.val();
        // Check if any user has the same username
        const usernameExists = Object.values(users).some(user => user.username === username);
        return usernameExists;
      }
      return false;
    } catch (error) {
      console.error("Error checking username:", error);
      return false;
    }
  };

  const isPasswordStrong = (password) => {
    // Password strength criteria
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    return strongPasswordRegex.test(password);
  };

  const handleSubmit = async (values) => {
    // Check if the username already exists
    const usernameExists = await checkUsernameExists(values.username);

    if (usernameExists) {
      message.error("Tên người dùng đã tồn tại. Vui lòng chọn tên khác."); // Show error message
      return; // Prevent registration
    }

    // Check if the password is strong enough
    if (!isPasswordStrong(values.password)) {
      message.error("Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt."); // Show error message
      return; // Prevent registration
    }

    // Create a new user reference with an auto-generated ID
    const newUserRef = push(ref(database, 'users'));

    try {
      await set(newUserRef, {
        username: values.username,
        password: values.password,
      });
      console.log("User added with ID:", newUserRef.key);
      message.success("Đăng ký thành công!"); // Success message
      navigate('/login'); // Redirect to login page
    } catch (error) {
      console.error("Error saving data:", error);
      message.error("Đã xảy ra lỗi khi lưu dữ liệu."); // Error message
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-md rounded-lg">
        <h2 className="text-2xl font-bold text-center text-gray-700">Đăng ký</h2>

        {/* Form with Ant Design */}
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
            />
          </Form.Item>

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

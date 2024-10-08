import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, push, set } from "firebase/database"; // Import `push` and `set` to auto-generate IDs
import { database } from "../../firebase";  // Import from Firebase config
import { Form, Input, Button } from 'antd'; // Import Ant Design components

function Register() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    // Create a new user reference with an auto-generated ID
    const newUserRef = push(ref(database, 'users'));

    try {
      await set(newUserRef, {
        username: values.username,
        password: values.password,
      });
      console.log("User added with ID:", newUserRef.key);
      navigate('/login'); // Redirect to login page
    } catch (error) {
      console.error("Error saving data:", error);
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

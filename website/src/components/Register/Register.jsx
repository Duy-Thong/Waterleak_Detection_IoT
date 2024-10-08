// src/components/Register/Register.js
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, push, set } from "firebase/database"; // Import `push` và `set` để tự động thêm ID
import { database } from "../../firebase";  // Import từ file cấu hình Firebase

function Register() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Tạo một ref mới trong "users" với ID tự động
    const newUserRef = push(ref(database, 'users'));

    set(newUserRef, {
      username: formData.username,
      password: formData.password,
    })
    .then(() => {
      console.log("Người dùng đã được thêm với ID:", newUserRef.key);
      navigate('/login'); // Điều hướng về trang đăng nhập
    })
    .catch((error) => {
      console.error("Lỗi khi lưu dữ liệu:", error);
    });
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-md rounded-lg">
        <h2 className="text-2xl font-bold text-center text-gray-700">Đăng ký</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-600">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-green-200 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-600">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-green-200 focus:border-green-500"
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 text-white bg-green-500 rounded-lg hover:bg-green-600 focus:outline-none focus:ring focus:ring-green-200"
          >
            Đăng ký
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Đã có tài khoản?{" "}
          <button
            onClick={() => navigate("/login")}
            className="text-green-500 hover:underline"
          >
            Quay lại đăng nhập
          </button>
        </p>
      </div>
    </div>
  );
}

export default Register;

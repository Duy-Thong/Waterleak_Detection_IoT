import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database"; 
import { database } from "../../firebase";     
import { useUser } from '../../contexts/UserContext'; // Import UserContext

function Login() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    deviceId: "",
  });

  const [error, setError] = useState(""); 
  const navigate = useNavigate();
  const { setUserId } = useUser(); // Get setUserId from UserContext

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");

  const usersRef = ref(database, 'users');
  try {
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
      let isValid = false;
      let currentUserId = null;

      snapshot.forEach((childSnapshot) => {
        const userData = childSnapshot.val();
        console.log(`Checking user: ${userData.username}`); // Log username being checked
        if (
          userData.username === formData.username &&
          userData.password === formData.password
        ) {
          isValid = true;
          currentUserId = childSnapshot.key; // Get the user ID from the database
        }
      });

      if (isValid) {
        console.log(`User authenticated: ${currentUserId}`); // Log user ID
        setUserId(currentUserId); // Update the userId in context
        navigate("/home"); // Redirect to Home
      } else {
        setError("Tên đăng nhập hoặc mật khẩu không đúng!"); // Invalid credentials
      }
    } else {
      setError("Không tìm thấy người dùng!"); // No users found
    }
  } catch (error) {
    console.error("Lỗi khi kiểm tra đăng nhập:", error);
    setError("Có lỗi xảy ra khi đăng nhập.");
  }
};


  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-md rounded-lg">
        <h2 className="text-2xl font-bold text-center text-gray-700">Đăng nhập</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-600">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-blue-200 focus:border-blue-500"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-blue-200 focus:border-blue-500"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-200"
          >
            Đăng nhập
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Chưa có tài khoản?{" "}
          <button
            onClick={() => navigate("/register")}
            className="text-blue-500 hover:underline"
          >
            Đăng ký
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;

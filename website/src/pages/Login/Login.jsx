import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendEmailVerification } from "firebase/auth";
import { useUser } from '../../contexts/UserContext';
import { Form, Input, Button, Alert, Divider, message } from 'antd';
import login from '../../assets/login.jpg';
import { getDatabase, ref, get, set } from 'firebase/database'; // Add Realtime Database imports


function Login() {
  const [error, setError] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const navigate = useNavigate();
  const { setUserId } = useUser();

  const handleSubmit = async (values) => {
    setError(""); 
    setLoading(true);

    const auth = getAuth();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);

      if (!userCredential.user.emailVerified) {
        // Log out the user immediately
        await auth.signOut();
        setError(
          <div>
            Email chưa được xác minh. 
            <Button 
              type="link" 
              onClick={async () => {
                try {
                  setResendingVerification(true);
                  await sendEmailVerification(userCredential.user);
                  message.success('Đã gửi lại email xác minh!');
                } catch (error) {
                  message.error('Không thể gửi lại email xác minh. Vui lòng thử lại sau.');
                } finally {
                  setResendingVerification(false);
                }
              }}
              loading={resendingVerification}
            >
              Gửi lại email xác minh
            </Button>
          </div>
        );
        return;
      }

      const user = userCredential.user;
      setUserId(user.uid);
      localStorage.setItem('userId', user.uid); // Lưu userId vào localStorage
      navigate("/home");
    } catch (error) {
      console.error("Lỗi khi kiểm tra đăng nhập:", error);
      setError("Email hoặc mật khẩu không đúng!");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in Realtime Database
      const db = getDatabase();
      const userRef = ref(db, `users/${user.uid}`);
      
      try {
        const snapshot = await get(userRef);
        
        if (!snapshot.exists()) {
          // Create new user profile with basic information
          const userData = {
            username: user.displayName || '',
            email: user.email,
            photoURL: user.photoURL || '',
            registrationMethod: 'google',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          };

          await set(userRef, userData);
        } else {
          // Update last login time for existing users
          await set(ref(db, `users/${user.uid}/lastLogin`), new Date().toISOString());
        }

        setUserId(user.uid);
        localStorage.setItem('userId', user.uid);
        navigate("/home");
      } catch (dbError) {
        console.error("Database error:", dbError);
        setError("Không thể kết nối với cơ sở dữ liệu. Vui lòng thử lại sau.");
      }

    } catch (error) {
      console.error("Google sign-in error:", error);
      let errorMessage = "Đăng nhập bằng Google thất bại. ";
      
      switch (error.code) {
        case 'auth/popup-blocked':
          errorMessage += "Vui lòng cho phép popup để tiếp tục.";
          break;
        case 'auth/popup-closed-by-user':
          errorMessage += "Đăng nhập bị hủy.";
          break;
        case 'auth/cancelled-popup-request':
          errorMessage += "Yêu cầu đăng nhập bị hủy.";
          break;
        default:
          errorMessage += "Vui lòng thử lại sau.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate("/forgot-password");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-200">
      <div className="bg-white shadow-xl rounded-lg flex w-3/4 max-w-4xl overflow-hidden backdrop-blur-sm bg-opacity-80 border-gray-200">
        
        {/* Left side with illustration */}
        <div className="hidden md:block w-1/2 bg-cyan-500 flex items-center justify-center">
          <img
            src={login} // Replace with your illustration URL
            alt="Illustration"
            className="w-full h-full object-cover max-w-2xl"
          />
        </div>

        {/* Right side with login form */}
        <div className="w-full md:w-1/2 p-8">
          <h2 className="text-2xl font-bold text-center text-gray-700">Đăng nhập</h2>

          {error && <Alert message={error} type="error" showIcon className="mb-4" />}

          <Form
            onFinish={handleSubmit}
            layout="vertical"
          >
            <Form.Item
              label="Email"
              name="email"
              rules={[{ required: true, message: 'Vui lòng nhập email' }]}
            >
              <Input placeholder="Nhập email" />
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

          <Divider>Hoặc</Divider>

          <Button 
            onClick={handleGoogleLogin} 
            className="w-full flex items-center justify-center gap-2"
            loading={loading}
            icon={
              !loading && (
                <img 
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                  alt="Google" 
                  className="w-4 h-4"
                />
              )
            }
          >
            Đăng nhập với Google
          </Button>

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

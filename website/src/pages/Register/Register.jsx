import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ref, set, get } from "firebase/database";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendEmailVerification } from "firebase/auth";
import { getFirestore, doc, setDoc } from 'firebase/firestore'; // Add Firestore imports
import { database, auth } from "../../firebase";
import { Form, Input, Button, Alert, Progress, Divider } from 'antd';
import { useUser } from '../../contexts/UserContext';
import register from '../../assets/register.jpg';

const DEFAULT_AVATAR = "https://vubtdxs1af4oyipf.public.blob.vercel-storage.com/default-zVurvnaf5BB60xeRyq39N7y707FtU6.png";

function Register() {
  const [form] = Form.useForm(); // Add Form hook
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
  });
  const [, setPasswordStrength] = useState("");
  const [strengthPercent, setStrengthPercent] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const navigate = useNavigate();
  const { setUserId } = useUser();
  const { state } = useLocation();
  const googleUser = state?.googleUser;
  const db = getFirestore(); // Initialize Firestore

  useEffect(() => {
    // Pre-fill form if coming from Google sign-in
    if (googleUser) {
      form.setFieldsValue({
        email: googleUser.email,
        name: googleUser.displayName,
        // Don't set password - user should still create one
      });
    }
  }, [googleUser, form]);

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
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*.])[A-Za-z\d!@#$%^&*.]{8,}$/;
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
    setVerificationSent(false);
    
    try {
      // Validate password
      if (!isPasswordStrong(values.password)) {
        throw new Error("Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.");
      }

      if (values.password !== values.confirmPassword) {
        throw new Error("Mật khẩu xác nhận không khớp.");
      }

      if (googleUser) {
        // For Google users, create user document with their Google UID
        await setDoc(doc(db, 'users', googleUser.uid), {
          email: values.email,
          displayName: values.name,
          photoURL: googleUser.photoURL,
          createdAt: new Date(),
          // Add any additional registration fields
        });
        
        setUserId(googleUser.uid);
        localStorage.setItem('userId', googleUser.uid);
      } else {
        // Normal email registration flow
        // First create the authentication user
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          values.email, 
          values.password
        );

        // Send verification email
        await sendEmailVerification(userCredential.user);
        setVerificationSent(true);

        // Wait for auth state to be ready
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Now that user is authenticated, write to database
        try {
          const newUserRef = ref(database, `users/${userCredential.user.uid}`);
          await set(newUserRef, {
            username: values.username,
            email: values.email,
            registrationMethod: 'email',
            password: values.password,
            photoURL: DEFAULT_AVATAR,
            emailVerified: false,
            createdAt: new Date().toISOString(),
          });

          // Set user ID but don't navigate yet
          setUserId(userCredential.user.uid);
          localStorage.setItem('userId', userCredential.user.uid);
          
          // Show success message instead of navigating
          setError("Vui lòng kiểm tra email của bạn để xác minh tài khoản. Sau khi xác minh, bạn có thể đăng nhập.");
          
          // Clear form and redirect to login after 5 seconds
          form.resetFields();
          setTimeout(() => {
            navigate('/login');
          }, 5000);

        } catch (dbError) {
          console.error("Database Error:", dbError);
          // If database write fails, delete the auth user
          await userCredential.user.delete();
          throw new Error("Không thể tạo hồ sơ người dùng. Vui lòng thử lại sau.");
        }
      }

    } catch (error) {
      console.error("Registration Error:", error);
      if (error.code === 'auth/email-already-in-use') {
        setError("Email này đã được sử dụng.");
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check if user exists
      const userRef = ref(database, `users/${result.user.uid}`);
      const userSnapshot = await get(userRef);
      
      if (userSnapshot.exists()) {
        throw new Error("Tài khoản Google này đã tồn tại. Vui lòng đăng nhập.");
      }

      // Create new user record
      await set(userRef, {
        username: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
        registrationMethod: 'google',
        createdAt: new Date().toISOString(),
      });
      
      // Set user ID in context and local storage
      setUserId(result.user.uid);
      localStorage.setItem('userId', result.user.uid);
      navigate('/home');

    } catch (error) {
      setError(error.message);
      if (error.message.includes("đã tồn tại")) {
        setTimeout(() => navigate('/login'), 3000);
      }
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
        <div className="md:block w-1/2 bg-blue-500 flex items-center justify-center">
          <img
            src={register} 
            alt="Illustration"
            className="w-full h-full object-cover max-w-2xl"
          />
        </div>

        {/* Right side with registration form */}
        <div className="w-full md:w-1/2 p-8">
          <h2 className="text-2xl font-bold text-center text-gray-700">Đăng ký</h2>

          {error && <Alert 
            message={error} 
            type={verificationSent ? "success" : "error"} 
            showIcon 
            className="mb-4" 
          />}

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
              rules={[{ required: true, message: 'Vui lòng nhập mật kh��u' }]}
            >
              <Input.Password
                placeholder="Nhập mật khẩu"
                onChange={(e) => handlePasswordChange(e.target.value)}
              />
            </Form.Item>

            <Form.Item
              label="Xác nhận mật khẩu"
              name="confirmPassword"
              rules={[
                { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="Xác nhận mật khẩu" />
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

          <Divider>Hoặc</Divider>

          <Button 
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2"
            icon={
              <img 
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                alt="Google" 
                className="w-4 h-4"
              />
            }
          >
            Đăng ký bằng Google
          </Button>

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

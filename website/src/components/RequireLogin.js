import React from 'react';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import accessDeniedImage from '../assets/accessdenied.webp';

const RequireLogin = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-t from-red-800 to-red-500">
            <div className="bg-white rounded-lg flex flex-col md:flex-row w-11/12 md:w-3/4 max-w-4xl overflow-hidden backdrop-blur-sm bg-opacity-80 border-gray-200">
                
                {/* Left side with illustration */}
                <div className="md:w-1/3 bg-cyan-500 flex items-center justify-center">
                    <img
                        src={accessDeniedImage}
                        alt="Access Denied"
                        className="w-full h-48 md:h-full object-cover max-w-2xl"
                    />
                </div>

                {/* Right side with notification */}
                <div className="w-full md:w-2/3 p-8 flex flex-col items-center justify-center">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800">Truy cập bị từ chối</h2>
                    <p className="text-red-500 text-lg font-bold mb-6 text-center">Bạn cần đăng nhập để sử dụng các chức năng này.</p>
                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                        <Button
                            className="hover:scale-105 transition-transform"
                            type="primary"
                            onClick={() => navigate('/login')}
                        >
                            Đăng Nhập
                        </Button>
                        <Button
                            onClick={() => navigate('/register')}
                        >
                            Đăng Ký
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RequireLogin;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WarningOutlined, LoginOutlined, UserAddOutlined } from '@ant-design/icons';
import accessDeniedImage from '../assets/denied.jpg';
import '../styles/button.css';

const RequireLogin = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-700 via-red-600 to-red-500 p-3">
            <div className="bg-white/95 rounded-2xl w-full max-w-md overflow-hidden shadow-xl backdrop-blur-xl">
                {/* Top image section */}
                <div className="relative h-40 bg-gradient-to-r from-red-600 to-red-400 flex items-center justify-center overflow-hidden">
                    <img
                        src={accessDeniedImage}
                        alt="Access Denied"
                        className="w-full h-full object-fit"
                    />
                </div>

                {/* Content section */}
                <div className="p-6">
                    <div className="text-center mb-6">
                        <div className="flex items-center justify-center mb-3">
                            <WarningOutlined className="text-3xl text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            Oops! Vội thế bạn ơi 🤡
                        </h2>
                        <div className="h-0.5 w-12 bg-red-600 mx-auto mb-3"></div>
                        <p className="text-gray-600 text-base">
                            Hãy đăng nhập để xem những điều thú vị phía sau nhé! 🚀
                        </p>
                    </div>

                    <div className="space-y-3 flex flex-col items-center">
                        <button className="button w-3/4 mx-auto" onClick={() => navigate('/login')}>
                            <div className="flex items-center justify-center w-full">
                                <LoginOutlined className="mr-2" />
                                <span>Đăng Nhập</span>
                            </div>
                        </button>
                        <div className="relative my-4 w-full">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-2 bg-white text-gray-500">Hoặc</span>
                            </div>
                        </div>
                        <div className="block w-full flex justify-center">
                            <button className="button w-3/4" onClick={() => navigate('/register')}>
                                <div className="flex items-center justify-center w-full">
                                    <UserAddOutlined className="mr-2" />
                                    <span>Đăng Ký</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RequireLogin;

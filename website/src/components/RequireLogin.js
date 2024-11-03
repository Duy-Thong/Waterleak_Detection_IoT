import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WarningOutlined, LoginOutlined, UserAddOutlined } from '@ant-design/icons';
import accessDeniedImage from '../assets/Shuba_duck.webp';
import '../styles/button.css';
import '../styles/global.css';
const RequireLogin = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center p-3 gradient-bg bg-gradient-to-r from-[#ee7752] via-[#e73c7e] to-[#23a6d5] bg-[length:400%_400%]">
            <div className="bg-white/90 rounded-2xl w-full max-w-md overflow-hidden shadow-xl backdrop-blur-xl border-2 border-white">
                {/* Top image section */}
                <div className="relative h-40 bg-gradient-to-r from-red-600 to-red-400 flex items-center justify-center overflow-hidden ">
                    <img
                        src={accessDeniedImage}
                        alt="Access Denied"
                        className="h-full object-fit"
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
                        <p className="text-gray-600 leading-relaxed text-sm">
                            Vội gì thì cũng đăng nhập đã bạn nhé! 🤖
                        </p>
                    </div>

                    <div className="space-y-4 flex flex-col items-center">
                        <button 
                            className="button w-3/4 px-6 py-2.5 rounded-lg bg-red-500 text-white font-semibold shadow-lg hover:bg-white hover:text-red-500 border-2 border-red-500 transition-all duration-300 transform hover:scale-105" 
                            onClick={() => navigate('/login')}
                        >
                            <div className="flex items-center justify-center w-full">
                                <LoginOutlined className="mr-2" />
                                <span>Đăng Nhập</span>
                            </div>
                        </button>
                        <div className="relative my-2 w-full">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-2 bg-white text-gray-500">Hoặc</span>
                            </div>
                        </div>
                        <button 
                            className="button w-3/4 px-6 py-2.5 rounded-lg bg-red-500 text-white font-semibold shadow-lg hover:bg-white hover:text-red-500 border-2 border-red-500 transition-all duration-300 transform hover:scale-105" 
                            onClick={() => navigate('/register')}
                        >
                            <div className="flex items-center justify-center w-full">
                                <UserAddOutlined className="mr-2" />
                                <span>Đăng Ký</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RequireLogin;

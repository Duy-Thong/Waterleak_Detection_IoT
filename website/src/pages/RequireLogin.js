import React from 'react';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const RequireLogin = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
            <div className="flex flex-col items-center justify-center flex-1">
                <p className="text-red-500"><strong>Bạn cần đăng nhập để sử dụng các chức năng này.</strong></p>
                <Button
                    className="mt-4"
                    type="primary"
                    onClick={() => navigate('/login')}
                >
                    Đăng Nhập
                </Button>
            </div>
        </div>
    );
};

export default RequireLogin;

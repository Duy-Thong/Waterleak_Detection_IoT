import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDatabase, ref, get } from "firebase/database";
import { Button, Empty, Spin,Alert } from 'antd';
import { useUser } from '../../contexts/UserContext';
import Navbar from '../../components/Navbar';
import WarningsList from '../../components/WarningsList';
import RequireLogin from '../../components/RequireLogin';
import { LoadingOutlined } from '@ant-design/icons';

const WarningPage = () => {
    const { deviceId } = useParams();
    const navigate = useNavigate();
    const { userId, logout } = useUser();
    const [warnings, setWarnings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!userId || !deviceId) return;
        fetchWarnings();
        const intervalId = setInterval(fetchWarnings, 5000);
        return () => clearInterval(intervalId);
    }, [userId, deviceId]);

    const fetchWarnings = async () => {
        try {
            setError(null);
            const db = getDatabase();
            const warningsRef = ref(db, `devices/${deviceId}/warning`);
            const snapshot = await get(warningsRef);
            
            if (snapshot.exists()) {
                const warningsArray = Object.entries(snapshot.val()).map(([id, warning]) => ({
                    ...warning,
                    id
                }));
                setWarnings(warningsArray);
            } else {
                setWarnings([]);
            }
        } catch (error) {
            console.error("Error fetching warnings:", error);
            setError("Không thể tải dữ liệu cảnh báo. Vui lòng thử lại sau.");
        } finally {
            setLoading(false);
        }
    };

    const handleResolveWarning = (warning, resolved) => {
        setWarnings(prevWarnings => 
            prevWarnings.map(w => 
                w.id === warning.id ? { ...w, resolved } : w
            )
        );
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };
    
    if (!userId) {
        return <RequireLogin />;
    }
    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Spin size="large" />
            </div>
        );
    }

    // Add error handling
    if (error) {
        return (
            <Alert
                message="Error"
                description={error}
                type="error"
                showIcon
                className="m-4"
            />
        );
    }

   

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-tl from-white to-blue-300">
            <Navbar onLogout={handleLogout} />
            <div className="flex flex-col items-center p-4 md:p-8 pt-10 mt-10">
                
                {loading ? (
                    <div className="text-blue-800">
                        <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
                    </div>
                ) : error ? (
                    <div className="text-red-600">{error}</div>
                ) : warnings.length > 0 ? (
                    <WarningsList 
                        warnings={warnings}
                        onResolveWarning={handleResolveWarning}
                        deviceId={deviceId}
                        buttonClassName="bg-opacity-50 bg-white border hover:bg-opacity-75 transition-all duration-300"
                    />
                ) : (
                    <div className='flex flex-col items-center justify-center gap-4 flex-grow'>
                        <Empty 
                            description="Không có cảnh báo nào" 
                            className="mb-4"
                        />
                        <Button 
                            type="primary" 
                            onClick={() => navigate('/home')}
                            className="px-6 py-2"
                        >
                            Quay về trang chủ
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WarningPage;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDatabase, ref, get, onValue, set } from "firebase/database";
import { Typography, Button, Input, message } from 'antd';
import { useUser } from '../../contexts/UserContext';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend
} from 'chart.js';
import Navbar from '../../components/Navbar';
import CurrentDeviceData from '../../components/CurrentDeviceData';
import Chart from '../../components/Chart';
import RelayControl from '../../components/RelayControl';
import RequireLogin from '../../components/RequireLogin';
import { Loading3QuartersOutlined, EditOutlined } from '@ant-design/icons';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend
);

const { Title: AntTitle } = Typography;

const DeviceDetail = () => {
    const { deviceId } = useParams();
    const navigate = useNavigate();
    const { userId, logout } = useUser();
    const [deviceData, setDeviceData] = useState(null);
    const [deviceName, setDeviceName] = useState('');
    const [latestData, setLatestData] = useState(null);
    const [relayState, setRelayState] = useState('OFF');
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [tempDeviceName, setTempDeviceName] = useState('');

    useEffect(() => {
        if (!userId || !deviceId) return;
        fetchDeviceData();
        const intervalId = setInterval(fetchDeviceData, 5000);
        return () => clearInterval(intervalId);
    }, [userId, deviceId]);

    const fetchDeviceData = async () => {
        try {
            const db = getDatabase();
            const deviceRef = ref(db, `devices/${deviceId}`);
            const snapshot = await get(deviceRef);
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                setDeviceData(data);
                setDeviceName(data.name || deviceId);
                
                if (data.flow_sensor) {
                    const flowSensorData = data.flow_sensor;
                    const sortedKeys = Object.keys(flowSensorData).sort();
                    if (sortedKeys.length > 0) {
                        const latestKey = sortedKeys[sortedKeys.length - 1];
                        setLatestData(flowSensorData[latestKey]);
                    }
                }
                
                setRelayState(data.relay?.control || 'OFF');
                setError(null);
            } else {
                setError("Không tìm thấy dữ liệu thiết bị");
            }
        } catch (error) {
            console.error("Error fetching device data:", error);
            setError("Có lỗi khi tải dữ liệu thiết bị");
        }
    };

    useEffect(() => {
        if (userId && deviceId) {
            const db = getDatabase();
            const relayRef = ref(db, `devices/${deviceId}/relay`);
            const unsubscribe = onValue(relayRef, (snapshot) => {
                const relayData = snapshot.val();
                if (relayData) {
                    setRelayState(relayData.control || 'OFF');
                }
            });
            return () => unsubscribe();
        }
    }, [userId, deviceId]);

    const toggleRelay = async () => {
        const newRelayState = relayState === 'OFF' ? 'ON' : 'OFF';
        try {
            const db = getDatabase();
            const relayRef = ref(db, `devices/${deviceId}/relay`);
            await set(relayRef, { control: newRelayState });
            setRelayState(newRelayState);
        } catch (error) {
            console.error("Error toggling relay:", error);
        }
    };

    const handleUpdateDeviceName = async () => {
        if (!tempDeviceName.trim()) {
            message.error('Tên thiết bị không được để trống');
            return;
        }
        if (tempDeviceName.length > 30) {
            message.error('Tên thiết bị không được vượt quá 30 ký tự');
            return;
        }
        try {
            const db = getDatabase();
            const deviceRef = ref(db, `devices/${deviceId}`);
            await set(deviceRef, {
                ...deviceData,
                name: tempDeviceName.trim()
            });
            setDeviceName(tempDeviceName.trim());
            setIsEditing(false);
            message.success('Cập nhật tên thiết bị thành công');
        } catch (error) {
            console.error("Error updating device name:", error);
            message.error('Có lỗi khi cập nhật tên thiết bị');
        }
    };

    const chartData = deviceData && deviceData.flow_sensor ? {
        labels: Object.values(deviceData.flow_sensor).map(data => data.timestamp),
        datasets: [
            {
                label: 'Cảm biến 1',
                data: Object.values(deviceData.flow_sensor).map(data => data.sensor1),
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
            },
            {
                label: 'Cảm biến 2',
                data: Object.values(deviceData.flow_sensor).map(data => data.sensor2),
                borderColor: 'rgba(153, 102, 255, 1)',
                backgroundColor: 'rgba(153, 102, 255, 0.2)',
                fill: true,
            }
        ]
    } : null;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (!userId) {
        return <RequireLogin />;
    }

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-t from-white to-blue-300">
            <Navbar onLogout={handleLogout} />
            <div className="flex flex-col items-center justify-center flex-1 p-4 md:p-8 mt-5">
                <div className="flex gap-2 items-end justify-center mb-3">
                    <AntTitle level={2} className="mt-8 !text-white !mb-0">
                        <strong>Chi tiết thiết bị: {isEditing ? (
                            <Input
                                value={tempDeviceName}
                                onChange={(e) => setTempDeviceName(e.target.value)}
                                onPressEnter={handleUpdateDeviceName}
                                style={{ width: '200px' }}
                                maxLength={30} // Add maxLength prop
                                showCount // Show character count
                            />
                        ) : deviceName}</strong>
                    </AntTitle>
                    <Button
                        icon={<EditOutlined />}
                        onClick={() => {
                            if (isEditing) {
                                handleUpdateDeviceName();
                            } else {
                                setTempDeviceName(deviceName);
                                setIsEditing(true);
                            }
                        }}
                        type="primary"
                    >
                        {isEditing ? 'Lưu' : 'Sửa'}
                    </Button>
                </div>

                {error ? (
                    <div className="text-red-500 mt-4">{error}</div>
                ) : (
                    <>
                        <div className="flex flex-col md:flex-row items-center gap-4 w-3/4 justify-evenly glassmorphism mb-5 p-5">
                            <Button 
                                onClick={() => navigate('/home')}
                                size="large"
                                type="primary"
                                ghost
                                danger
                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
                            >
                                Trở về
                            </Button>
                            <RelayControl relayState={relayState} onToggleRelay={toggleRelay} />
                            <Button 
                                onClick={() => navigate(`/device/${deviceId}/history`)}
                                size="large"
                                style={{ 
                                    borderColor: '#52c41a', 
                                    color: '#52c41a',
                                    backgroundColor: 'rgba(255, 255, 255, 0.5)'
                                }}
                                ghost
                            >
                                Xem lịch sử
                            </Button>
                        </div>

                        {deviceData && latestData ? (
                            <>
                                <CurrentDeviceData latestData={latestData} />
                                {chartData && <Chart chartData={chartData} className="mt-4 hidden-mobile" />}
                            </>
                        ) : (
                            <Loading3QuartersOutlined className="text-4xl text-white mt-4" />
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default DeviceDetail;

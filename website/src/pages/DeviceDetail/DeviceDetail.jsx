import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDatabase, ref, get, onValue, set } from "firebase/database";
import { Typography, Button } from 'antd';
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
                <AntTitle level={2} className="mt-8 !text-white">
                    <strong>Chi tiết thiết bị: {deviceName}</strong>
                </AntTitle>

                {error ? (
                    <div className="text-red-500 mt-4">{error}</div>
                ) : (
                    <>
                        <div className="flex flex-col md:flex-row items-center gap-4 w-full max-w-4xl justify-center">
                            <Button 
                                onClick={() => navigate('/home')}
                                className="bg-blue-600 text-white hover:bg-blue-700"
                            >
                                ← Trở về
                            </Button>
                            <RelayControl relayState={relayState} onToggleRelay={toggleRelay} />
                            <Button 
                                onClick={() => navigate(`/device/${deviceId}/history`)}
                                className="bg-green-600 text-white hover:bg-green-700"
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
                            <p>Đang tải dữ liệu...</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default DeviceDetail;

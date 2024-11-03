import React, { useState, useEffect, useRef } from 'react';  // Add useRef
import { useParams, useNavigate } from 'react-router-dom';
import { getDatabase, ref, get, onValue, set } from "firebase/database";
import { Typography, Button, Input, message, Alert, Spin } from 'antd';
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
import WarningStats from '../../components/WarningStats';  // Make sure this path is correct

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
    // Add navigate and destructure logout from useUser
    const navigate = useNavigate();
    const { userId, logout } = useUser();
    
    // Consolidate states into a single object
    const [state, setState] = useState({
        deviceData: null,
        deviceName: '',
        latestData: null,
        relayState: 'OFF',
        warnings: [] // Add warnings array to state
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [tempDeviceName, setTempDeviceName] = useState('');

    const { deviceId } = useParams();
    
    // Refs for optimization
    const prevDataRef = useRef(null);
    const intervalRef = useRef(null);
    const isMountedRef = useRef(true);
    const lastUpdateTimeRef = useRef(Date.now());
    const reconnectAttempts = useRef(0);
    const MAX_RECONNECT_ATTEMPTS = 3;

    const handlePollingError = (error) => {
        console.error("Polling error:", error);
        if (isMountedRef.current) {
            setError("Có lỗi khi tải dữ liệu thiết bị");
        }
    };

    useEffect(() => {
        isMountedRef.current = true;
        let unsubscribe = null;
        let warningUnsubscribe = null; // Add new unsubscribe for warnings

        const setupRealtimeConnection = () => {
            if (!userId || !deviceId) return;

            const db = getDatabase();
            const deviceRef = ref(db, `devices/${deviceId}`);
            const warningsRef = ref(db, `warnings/${deviceId}`); // Add warnings reference

            // Setup warning listener
            warningUnsubscribe = onValue(warningsRef, (snapshot) => {
                if (!isMountedRef.current) return;

                if (snapshot.exists()) {
                    const warningsData = snapshot.val();
                    const warningsArray = Object.keys(warningsData).map(key => ({
                        id: key,
                        ...warningsData[key]
                    }));

                    setState(prev => ({
                        ...prev,
                        warnings: warningsArray.sort((a, b) => b.timestamp - a.timestamp)
                    }));
                } else {
                    setState(prev => ({ ...prev, warnings: [] }));
                }
            }, (errorVal) => {
                console.error("Warning listener error:", errorVal);
                if (isMountedRef.current) {
                    setError("Có lỗi khi tải dữ liệu cảnh báo");
                }
            });

            // Existing device data listener
            unsubscribe = onValue(deviceRef, (snapshot) => {
                if (!isMountedRef.current) return;

                if (snapshot.exists()) {
                    const newData = snapshot.val();
                    lastUpdateTimeRef.current = Date.now();
                    reconnectAttempts.current = 0;

                    if (JSON.stringify(newData) !== JSON.stringify(prevDataRef.current)) {
                        prevDataRef.current = newData;
                        
                        setState(prev => ({
                            ...prev,
                            deviceData: newData,
                            deviceName: newData.name || deviceId,
                            relayState: newData.relay?.control || 'OFF',
                            latestData: newData.flow_sensor ? 
                                Object.values(newData.flow_sensor)[Object.values(newData.flow_sensor).length - 1] 
                                : null
                        }));
                    }
                    setError(null);
                    setLoading(false);
                } else {
                    if (isMountedRef.current) {
                        setError("Không tìm thấy dữ liệu thiết bị");
                    }
                }
            }, (errorVal) => {
                console.error("Real-time connection error:", errorVal);
                handleConnectionError();
            });
        };

        const handleConnectionError = () => {
            if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts.current++;
                setTimeout(() => {
                    if (isMountedRef.current) {
                        setupRealtimeConnection();
                    }
                }, 1000 * reconnectAttempts.current); // Exponential backoff
            } else {
                setError("Không thể kết nối tới thiết bị. Vui lòng thử lại sau.");
            }
        };

        // Polling fallback
        const pollData = async () => {
            if (!isMountedRef.current || Date.now() - lastUpdateTimeRef.current < 10000) return;

            try {
                const db = getDatabase();
                const deviceRef = ref(db, `devices/${deviceId}`);
                const snapshot = await get(deviceRef);

                if (snapshot.exists() && isMountedRef.current) {
                    const newData = snapshot.val();
                    lastUpdateTimeRef.current = Date.now();

                    if (JSON.stringify(newData) !== JSON.stringify(prevDataRef.current)) {
                        prevDataRef.current = newData;
                        setState(prev => ({
                            ...prev,
                            deviceData: newData,
                            deviceName: newData.name || deviceId,
                            relayState: newData.relay?.control || 'OFF',
                            latestData: newData.flow_sensor ?
                                Object.values(newData.flow_sensor)[Object.values(newData.flow_sensor).length - 1]
                                : null
                        }));
                    }
                }
            } catch (errorVal) {
                handlePollingError(errorVal);
            }
        };

        // Setup initial connection
        setupRealtimeConnection();

        // Setup polling interval
        intervalRef.current = setInterval(pollData, 5000);

        return () => {
            isMountedRef.current = false;
            if (unsubscribe) unsubscribe();
            if (warningUnsubscribe) warningUnsubscribe(); // Clean up warnings listener
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [userId, deviceId]);

    const toggleRelay = async () => {
        const newRelayState = state.relayState === 'OFF' ? 'ON' : 'OFF';
        try {
            const db = getDatabase();
            const relayRef = ref(db, `devices/${deviceId}/relay`);
            await set(relayRef, { control: newRelayState });
            setState(prev => ({ ...prev, relayState: newRelayState }));
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
                ...state.deviceData,
                name: tempDeviceName.trim()
            });
            setState(prev => ({ ...prev, deviceName: tempDeviceName.trim() }));
            setIsEditing(false);
            message.success('Cập nhật tên thiết bị thành công');
        } catch (errorVal) {
            console.error("Error updating device name:", errorVal);
            message.error('Có lỗi khi cập nhật tên thiết bị');
        }
    };

    const chartData = state.deviceData && state.deviceData.flow_sensor ? {
        labels: Object.values(state.deviceData.flow_sensor).map(data => data.timestamp),
        datasets: [
            {
                label: 'Cảm biến 1',
                data: Object.values(state.deviceData.flow_sensor).map(data => data.sensor1),
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
            },
            {
                label: 'Cảm biến 2',
                data: Object.values(state.deviceData.flow_sensor).map(data => data.sensor2),
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

    // Update handleResolveWarning to use Firebase
    const handleResolveWarning = async (warningId, resolved) => {
        try {
            const db = getDatabase();
            const warningRef = ref(db, `warnings/${deviceId}/${warningId}`);
            await set(warningRef, {
                ...state.warnings.find(w => w.id === warningId),
                resolved,
                resolvedAt: resolved ? Date.now() : null
            });
            message.success('Cập nhật trạng thái cảnh báo thành công');
        } catch (errorVal) {
            console.error("Error updating warning:", errorVal);
            message.error('Có lỗi khi cập nhật trạng thái cảnh báo');
        }
    };

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

    if (!userId) {
        return <RequireLogin />;
    }

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-tl from-blue-100 to-blue-300">
            <Navbar onLogout={handleLogout} />
            <div className="flex flex-col items-center justify-center flex-1 p-4 md:p-8 mt-5">
                <div className="flex gap-2 items-end justify-center mb-3">
                    <AntTitle level={2} className="mt-8 !text-white !mb-0">
                        <strong>Chi tiết thiết bị: {isEditing ? (
                            <Input
                                value={tempDeviceName}
                                onChange={(e) => setTempDeviceName(e.target.value)}
                                onPressEnter={handleUpdateDeviceName}
                                style={{ width: '300px' }}
                                maxLength={30} // Add maxLength prop
                                showCount // Show character count
                            />
                        ) : state.deviceName}</strong>
                    </AntTitle>
                    <Button
                        icon={<EditOutlined />}
                        onClick={() => {
                            if (isEditing) {
                                handleUpdateDeviceName();
                            } else {
                                setTempDeviceName(state.deviceName);
                                setIsEditing(true);
                            }
                        }}
                        type="primary"
                        ghost
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
                    >
                        {isEditing ? 'Lưu' : 'Sửa'}
                    </Button>
                </div>

                {error ? (
                    <div className="text-red-500 mt-4">{error}</div>
                ) : (
                    <>
                        <div className="flex flex-col md:flex-row items-center gap-4 w-3/4 justify-evenly glassmorphism mb-3 p-4">
                            <Button 
                                onClick={() => navigate('/home')}
                                size="middle"
                                type="primary"
                                ghost
                                danger
                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
                            >
                                Trở về
                            </Button>
                            <RelayControl relayState={state.relayState} onToggleRelay={toggleRelay} />
                        
                            
                        </div>

                        <WarningStats 
                            deviceId={deviceId} 
                            navigate={navigate}
                            warnings={state.warnings} // Pass warnings to WarningStats
                            onResolveWarning={handleResolveWarning}
                        />
                        
                        {state.deviceData && state.latestData ? (
                            <>
                                <CurrentDeviceData 
                                    latestData={state.latestData} 
                                    deviceId={deviceId} 
                                    navigate={navigate}
                                />
                                {chartData && <Chart chartData={chartData} className="mt-4 hidden-mobile" />}
                            </>
                            ) : (
                                <Loading3QuartersOutlined spin className="text-4xl text-white mt-4" />
                            )
                            }
                    </>
                )}
            </div>
        </div>
    );
};

export default DeviceDetail;

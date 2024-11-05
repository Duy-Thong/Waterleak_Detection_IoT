import React, { useState, useEffect, useRef } from 'react';  // Add useRef
import { useParams, useNavigate } from 'react-router-dom';
import { getDatabase, ref, get, onValue, set } from "firebase/database";
import { Typography, Button, Input, message, Alert, Spin, Modal, List } from 'antd';
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
import { Loading3QuartersOutlined, EditOutlined, CheckCircleFilled, CloseCircleFilled, LineChartOutlined } from '@ant-design/icons';
import WarningStats from '../../components/WarningStats';  // Make sure this path is correct
import { UserOutlined, MailOutlined, GoogleOutlined } from '@ant-design/icons';  // Add GoogleOutlined

// Add isDeviceActive helper function
const isDeviceActive = (deviceData) => {
    if (!deviceData || !deviceData.flow_sensor) return false;
    
    const flowSensorData = deviceData.flow_sensor;
    const sortedKeys = Object.keys(flowSensorData).sort();
    
    if (sortedKeys.length === 0) return false;
    
    const latestKey = sortedKeys[sortedKeys.length - 1];
    const latestTimestamp = flowSensorData[latestKey].timestamp;
    
    const now = Date.now();
    const lastActivity = new Date(latestTimestamp).getTime();
    return (now - lastActivity) < 10000; // 10 seconds threshold
};

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
    const navigate = useNavigate();
    const { userId, logout } = useUser();
    const { deviceId } = useParams();
    
    const [state, setState] = useState({
        deviceData: null,
        deviceName: '',
        latestData: null,
        relayState: 'OFF',
        warnings: [] // Add warnings to state
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [tempDeviceName, setTempDeviceName] = useState('');
    const [usersWithAccess, setUsersWithAccess] = useState([]);
    const [isUsersModalVisible, setIsUsersModalVisible] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    
    // Chỉ giữ lại refs cần thiết
    const isMountedRef = useRef(true);
    const [isActive, setIsActive] = useState(false);
    const activityCheckInterval = useRef(null);

    useEffect(() => {
        isMountedRef.current = true;
        let deviceUnsubscribe = null;
        let warningUnsubscribe = null;

        const setupRealtimeConnections = () => {
            if (!userId || !deviceId) return;

            const db = getDatabase();
            const deviceRef = ref(db, `devices/${deviceId}`);
            const warningRef = ref(db, `devices/${deviceId}/warning`);

            // Device data subscription
            deviceUnsubscribe = onValue(deviceRef, (snapshot) => {
                if (!isMountedRef.current) return;

                if (snapshot.exists()) {
                    const newData = snapshot.val();
                    setState(prev => ({
                        ...prev,
                        deviceData: newData,
                        deviceName: newData.name || deviceId,
                        relayState: newData.relay?.control || 'OFF',
                        latestData: newData.flow_sensor ? 
                            Object.values(newData.flow_sensor)[Object.values(newData.flow_sensor).length - 1] 
                            : null
                    }));
                    setError(null);
                } else {
                    setError("Không tìm thấy dữ liệu thiết bị");
                }
                setLoading(false);
            });

            // Separate warning subscription
            warningUnsubscribe = onValue(warningRef, (snapshot) => {
                if (!isMountedRef.current) return;

                if (snapshot.exists()) {
                    const warningsData = snapshot.val();
                    const warningsArray = Object.entries(warningsData)
                        .map(([key, value]) => ({
                            id: key,
                            ...value
                        }))
                        .sort((a, b) => b.timestamp - a.timestamp);

                    setState(prev => ({
                        ...prev,
                        warnings: warningsArray
                    }));
                } else {
                    setState(prev => ({
                        ...prev,
                        warnings: []
                    }));
                }
            });
        };

        setupRealtimeConnections();

        return () => {
            isMountedRef.current = false;
            if (deviceUnsubscribe) deviceUnsubscribe();
            if (warningUnsubscribe) warningUnsubscribe();
        };
    }, [userId, deviceId]);

    useEffect(() => {
        // Set up activity check interval
        activityCheckInterval.current = setInterval(() => {
            setIsActive(isDeviceActive(state.deviceData));
        }, 1000);

        return () => {
            if (activityCheckInterval.current) {
                clearInterval(activityCheckInterval.current);
            }
        };
    }, [state.deviceData]);

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

    const fetchUsersWithAccess = async () => {
        setLoadingUsers(true);
        try {
            const db = getDatabase();
            const usersRef = ref(db, 'users');
            const snapshot = await get(usersRef);
            
            if (snapshot.exists()) {
                const users = [];
                const userData = snapshot.val();
                
                for (const [uid, user] of Object.entries(userData)) {
                    if (user.devices && user.devices[deviceId]) {
                        users.push({
                            id: uid,
                            ...user
                        });
                    }
                }
                
                setUsersWithAccess(users);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            message.error('Không thể tải danh sách người dùng');
        }
        setLoadingUsers(false);
    };

    const showUsersModal = () => {
        setIsUsersModalVisible(true);
        fetchUsersWithAccess();
    };

    // Add this helper function to get provider icon
    const getProviderIcon = (providerType) => {
        switch (providerType) {
            case 'google':
                return <GoogleOutlined className="text-red-500" />;
            case 'email':
                return <MailOutlined className="text-blue-500" />;
            default:
                return null;
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

    const handleResolveWarning = async (warningId, resolved) => {
        try {
            const warning = state.warnings.find(w => w.id === warningId);
            if (!warning) {
                throw new Error('Warning not found');
            }

            const db = getDatabase();
            await set(ref(db, `devices/${deviceId}/warning/${warningId}`), {
                ...warning,
                resolved,
                resolvedAt: resolved ? Date.now() : null
            });
            message.success('Cập nhật trạng thái cảnh báo thành công');
        } catch (error) {
            console.error("Error updating warning:", error);
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
            <div className="flex flex-col items-center justify-center flex-1 p-4 md:p-8 mt-16">
                <div className="flex flex-col sm:flex-row gap-2 items-center justify-center mb-3 w-full px-4">
                    <AntTitle level={2} className="!text-white !mb-0 text-center">
                        <strong className="flex items-center justify-center gap-2 flex-wrap sm:flex-nowrap">
                            
                            {isEditing ? (
                                <Input
                                    value={tempDeviceName}
                                    onChange={(e) => setTempDeviceName(e.target.value)}
                                    onPressEnter={handleUpdateDeviceName}
                                    style={{ 
                                        width: '100%',
                                        minWidth: '200px',
                                        maxWidth: '300px',
                                        background: 'transparent',
                                        border: '2px solid rgba(255, 255, 255, 0.8)',
                                        color: 'white',
                                        textAlign: 'center'
                                    }}
                                    maxLength={30}
                                    showCount
                                />
                            ) : (
                                <span className={`break-all text-center ${state.deviceName.length > 20 ? 'text-xl' : state.deviceName.length > 15 ? 'text-2xl' : 'text-3xl'}`}>
                                    {state.deviceName}
                                </span>
                            )}
                        </strong>
                    </AntTitle>
                    <Button
                        className="self-center"
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
                                <RelayControl relayState={state.relayState} onToggleRelay={toggleRelay} isActive={isActive} />
                            <div className="flex items-center gap-2">
                                {isActive ? (
                                    <>
                                        <CheckCircleFilled className="text-green-500 text-xl" />
                                        <span className="text-green-600 font-medium">Đang hoạt động</span>
                                    </>
                                ) : (
                                    <>
                                        <CloseCircleFilled className="text-red-500 text-xl" />
                                        <span className="text-red-600 font-medium">Không hoạt động</span>
                                    </>
                                )}
                            </div>
                            <Button
                                onClick={showUsersModal}
                                size="middle"
                                type="primary"
                                ghost
                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
                            >
                                Xem người dùng
                            </Button>
                        </div>

                        <Modal
                            title={
                                <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                                    <div className="bg-blue-50 p-2 rounded-lg">
                                        <UserOutlined className="text-xl text-blue-500" />
                                    </div>
                                    <span className="text-base sm:text-xl font-medium text-gray-700 line-clamp-1">
                                        Danh sách người dùng có quyền truy cập
                                    </span>
                                </div>
                            }
                            open={isUsersModalVisible}
                            onCancel={() => setIsUsersModalVisible(false)}
                            footer={null}
                            style={{ 
                                maxWidth: '600px',
                                padding:'20px',
                                top: 20
                            }}
                            width="auto"
                        >
                            {loadingUsers ? (
                                <div className="flex justify-center items-center py-8">
                                    <Spin size="large" />
                                </div>
                            ) : (
                                <List
                                    dataSource={usersWithAccess}
                                    renderItem={user => (
                                        <List.Item className="hover:bg-gray-50 rounded-lg transition-all duration-300 p-2 sm:p-4">
                                            <List.Item.Meta
                                                avatar={
                                                    user.photoURL ? (
                                                        <img 
                                                            src={user.photoURL} 
                                                            alt={user.username || 'User'} 
                                                            className="w-8 h-8 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-blue-100"
                                                        />
                                                    ) : (
                                                        <div className="flex justify-center items-center w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 text-blue-500">
                                                            <UserOutlined className="text-base sm:text-xl" />
                                                        </div>
                                                    )
                                                }
                                                title={
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-semibold text-gray-800 text-sm sm:text-base">
                                                            {user.username || 'Người dùng'}
                                                        </span>
                                                        <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full text-xs">
                                                            {getProviderIcon(user.registrationMethod)}
                                                            <span className="text-gray-600">
                                                                {user.registrationMethod === 'google' ? 'Google' : 'Email'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                }
                                                description={
                                                    <div className="flex flex-col gap-1 mt-1">
                                                        <div className="flex items-center gap-2 text-gray-500 text-xs sm:text-sm break-all">
                                                            <MailOutlined className="text-blue-400 flex-shrink-0" />
                                                            <span>{user.email}</span>
                                                        </div>
                                                        <div className="text-xs text-gray-400">
                                                            Đã tham gia: {new Date(user.createdAt).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                    locale={{
                                        emptyText: (
                                            <div className="flex flex-col items-center justify-center py-4 sm:py-8 text-gray-500">
                                                <div className="bg-gray-100 p-3 sm:p-4 rounded-full mb-3">
                                                    <UserOutlined style={{ fontSize: '1.5rem' }} />
                                                </div>
                                                <span className="text-base sm:text-lg font-medium">Không có người dùng nào</span>
                                                <span className="text-xs sm:text-sm text-gray-400 mt-1">Chưa có người dùng nào được cấp quyền truy cập</span>
                                            </div>
                                        )
                                    }}
                                    className="px-0 sm:px-2"
                                />
                            )}
                        </Modal>

                        <WarningStats 
                            deviceId={deviceId} 
                            navigate={navigate}
                            warnings={state.warnings} // Use warnings from state
                            onResolveWarning={handleResolveWarning}
                            loading={loading}
                            error={error}
                        />
                        
                        {state.deviceData && state.latestData ? (
                            <>
                                <CurrentDeviceData 
                                    latestData={state.latestData} 
                                    deviceId={deviceId} 
                                    navigate={navigate}
                                />
                                {chartData && (
                                    <div className="w-3/4  p-4 mt-4 glassmorphism rounded-lg min-h-36">
                                        <div className="flex flex-col items-center">
                                            <Chart chartData={chartData} className="w-full hidden-mobile" />
                                            <Button 
                                                onClick={() => navigate(`/device/${deviceId}/statistics`)}
                                                type="primary"
                                                icon={<LineChartOutlined />}
                                                size="large"
                                                className="flex items-center gap-2 mt-4"
                                                style={{ 
                                                    backgroundColor: 'rgba(255, 255, 255, 0.5)',
                                                    borderRadius: '8px',
                                                    padding: '0 20px',
                                                }}
                                                ghost
                                            >
                                                Thống kê chi tiết
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <Loading3QuartersOutlined spin className="text-4xl text-white mt-4" />
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default DeviceDetail;

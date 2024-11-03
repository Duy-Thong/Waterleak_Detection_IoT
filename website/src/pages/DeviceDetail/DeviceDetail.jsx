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
import { Loading3QuartersOutlined, EditOutlined } from '@ant-design/icons';
import WarningStats from '../../components/WarningStats';  // Make sure this path is correct
import { UserOutlined, MailOutlined } from '@ant-design/icons';

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
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-center mb-3 w-full px-4">
                    <AntTitle level={2} className="!text-white !mb-0 text-center sm:text-left mt-0">
                        <strong className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            <span className="whitespace-nowrap">Chi tiết thiết bị:</span>
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
                                        color: 'white'
                                    }}
                                    maxLength={30}
                                    showCount
                                />
                            ) : (
                                <span className="break-all">{state.deviceName}</span>
                            )}
                        </strong>
                    </AntTitle>
                    <Button
                        className="self-center sm:self-auto mt-2 sm:mt-0"
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
                                <div className="flex items-center gap-2 text-lg">
                                    <UserOutlined />
                                    <span>Danh sách người dùng có quyền truy cập</span>
                                </div>
                            }
                            open={isUsersModalVisible}
                            onCancel={() => setIsUsersModalVisible(false)}
                            footer={null}
                            width={600}
                            centered
                            className="custom-modal"
                        >
                            {loadingUsers ? (
                                <div className="flex justify-center items-center py-8">
                                    <Spin size="large" />
                                </div>
                            ) : (
                                <List
                                    dataSource={usersWithAccess}
                                    renderItem={user => (
                                        <List.Item className="hover:bg-gray-50 rounded-lg transition-all duration-300">
                                            <List.Item.Meta
                                                avatar={
                                                    user.photoURL ? (
                                                        <img 
                                                            src={user.photoURL} 
                                                            alt={user.username || 'User'} 
                                                            className="w-10 h-10 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex justify-center items-center w-10 h-10 rounded-full bg-blue-100 text-blue-500">
                                                            <UserOutlined />
                                                        </div>
                                                    )
                                                }
                                                title={
                                                    <span className="font-semibold">
                                                        {user.username || 'Người dùng'}
                                                    </span>
                                                }
                                                description={
                                                    <div className="flex items-center gap-2 text-gray-500">
                                                        <MailOutlined />
                                                        <span>{user.email}</span>
                                                    </div>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                    locale={{
                                        emptyText: (
                                            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                                                <UserOutlined style={{ fontSize: '2rem' }} />
                                                <span className="mt-2">Không có người dùng nào</span>
                                            </div>
                                        )
                                    }}
                                    className="px-2"
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
                                {chartData && <Chart chartData={chartData} className="mt-4 hidden-mobile" />}
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

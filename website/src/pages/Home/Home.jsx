import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get, onValue, off } from "firebase/database";  // Add onValue and off
import { useUser } from '../../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { Typography, Input, Tooltip, Row, Col, Modal, Form, Input as AntInput, Button, message, Badge, FloatButton } from 'antd';
import { SearchOutlined, AppstoreOutlined, AlertOutlined, HomeOutlined, CustomerServiceOutlined, UserOutlined, MailOutlined, MessageOutlined, SendOutlined, CloseOutlined } from '@ant-design/icons';
import { Spin, Alert, Card, Statistic } from 'antd';
import emailjs from '@emailjs/browser';

import Navbar from '../../components/Navbar';
import DeviceCard from '../../components/DeviceCard';
import RequireLogin from '../../components/RequireLogin';

const { Title: AntTitle } = Typography;

const Home = () => {
    const [devices, setDevices] = useState([]);
    const [deviceNames, setDeviceNames] = useState({});
    const [username, setUsername] = useState('');
    const { userId, logout } = useUser();
    const navigate = useNavigate();
    const [searchText, setSearchText] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Add new statistics state
    const [stats, setStats] = useState({
        totalDevices: 0,
        activeDevices: 0,
        alertsToday: 0
    });

    const [isContactModalVisible, setIsContactModalVisible] = useState(false);
    const [form] = Form.useForm();

    const [deviceStatuses, setDeviceStatuses] = useState({});

    // Add reference for warning listeners
    const [warningListeners, setWarningListeners] = useState({});

    // Modified isDeviceActive function
    const isDeviceActive = (deviceData) => {
        if (!deviceData || !deviceData.flow_sensor) return false;
        
        const flowSensorData = deviceData.flow_sensor;
        const sortedKeys = Object.keys(flowSensorData).sort();
        
        if (sortedKeys.length === 0) return false;
        
        const latestKey = sortedKeys[sortedKeys.length - 1];
        const latestTimestamp = flowSensorData[latestKey].timestamp;
        
        const now = Date.now();
        const lastActivity = new Date(latestTimestamp).getTime();
        return (now - lastActivity) < 10000; // 60000 ms = 1 minute
    };

    const countWarningsToday = (deviceData) => {
        if (!deviceData || !deviceData.warning) return 0;

        const warnings = Object.values(deviceData.warning);
        const today = new Date().setHours(0, 0, 0, 0);

        // Add logging to check warnings data
        console.log('All warnings:', warnings);
        
        const filteredWarnings = warnings.filter(warning => {
            const warningDate = new Date(warning.timestamp).setHours(0, 0, 0, 0);
            // Log each warning's resolved status
            console.log('Warning:', warning);
            console.log('Warning resolved status:', warning.resolved);
            return warningDate === today && warning.resolved !== true;
        });

        // Log filtered results
        console.log('Filtered warnings:', filteredWarnings);
        
        return filteredWarnings.length;
    };

    const getWarningsCount = (deviceId) => {
        const deviceData = deviceStatuses[deviceId]?.data;
        return countWarningsToday(deviceData);
    };

    useEffect(() => {
        if (userId) {
            setLoading(true);
            const db = getDatabase();
            const userRef = ref(db, 'users/' + userId);
            get(userRef)
                .then((snapshot) => {
                    if (snapshot.exists()) {
                        const userData = snapshot.val();
                        const userDevices = Object.keys(userData.devices || {});
                        setDevices(userDevices);
                        setUsername(userData.username);

                        // Fetch each device's data
                        const devicePromises = userDevices.map(deviceId => {
                            const deviceRef = ref(db, `devices/${deviceId}`);
                            return get(deviceRef);
                        });

                        Promise.all(devicePromises).then(deviceSnapshots => {
                            const statuses = {};
                            let activeCount = 0;
                            let totalWarningsToday = 0;

                            deviceSnapshots.forEach(snapshot => {
                                if (snapshot.exists()) {
                                    const deviceData = snapshot.val();
                                    const isActive = isDeviceActive(deviceData);
                                    
                                    statuses[snapshot.key] = {
                                        name: deviceData.name || snapshot.key,
                                        data: deviceData,
                                        isActive
                                    };

                                    if (isActive) activeCount++;
                                    totalWarningsToday += countWarningsToday(deviceData);
                                }
                            });

                            setDeviceStatuses(statuses);
                            setDeviceNames(prev => ({
                                ...prev,
                                ...Object.fromEntries(
                                    Object.entries(statuses).map(([id, data]) => [id, data.name])
                                )
                            }));
                            
                            setStats(prev => ({
                                ...prev,
                                totalDevices: userDevices.length,
                                activeDevices: activeCount,
                                alertsToday: totalWarningsToday
                            }));
                        });
                    }
                })
                .catch((error) => {
                    setError("Không thể tải dữ liệu. Vui lòng thử lại sau.");
                })
                .finally(() => setLoading(false));
        }
    }, [userId]);

    // Modified fetchDeviceData function to set up warning listeners
    const fetchDeviceData = async () => {
        if (!userId || !devices.length) return;
        
        const db = getDatabase();
        const devicePromises = devices.map(deviceId => {
            const deviceRef = ref(db, `devices/${deviceId}`);
            return get(deviceRef);
        });

        try {
            const deviceSnapshots = await Promise.all(devicePromises);
            const statuses = {};
            let activeCount = 0;
            let totalWarningsToday = 0;

            deviceSnapshots.forEach(snapshot => {
                if (snapshot.exists()) {
                    const deviceData = snapshot.val();
                    const isActive = isDeviceActive(deviceData);
                    
                    statuses[snapshot.key] = {
                        name: deviceData.name || snapshot.key,
                        data: deviceData,
                        isActive
                    };

                    if (isActive) activeCount++;
                    totalWarningsToday += countWarningsToday(deviceData);

                    // Set up warning listener if not already set
                    if (!warningListeners[snapshot.key]) {
                        const warningRef = ref(db, `devices/${snapshot.key}/warning`);
                        const listener = onValue(warningRef, (warningSnapshot) => {
                            const warningData = warningSnapshot.exists() ? warningSnapshot.val() : null;
                            
                            setDeviceStatuses(prev => {
                                const updatedStatuses = {
                                    ...prev,
                                    [snapshot.key]: {
                                        ...prev[snapshot.key],
                                        data: {
                                            ...prev[snapshot.key]?.data,
                                            warning: warningData
                                        }
                                    }
                                };

                                // Calculate new total warnings
                                const newTotal = Object.values(updatedStatuses).reduce((total, device) => {
                                    return total + countWarningsToday(device.data);
                                }, 0);

                                // Update stats after calculating new total
                                setStats(prevStats => ({
                                    ...prevStats,
                                    alertsToday: newTotal
                                }));

                                return updatedStatuses;
                            });
                        });

                        setWarningListeners(prev => ({
                            ...prev,
                            [snapshot.key]: listener
                        }));
                    }
                }
            });

            setDeviceStatuses(statuses);
            setDeviceNames(prev => ({
                ...prev,
                ...Object.fromEntries(
                    Object.entries(statuses).map(([id, data]) => [id, data.name])
                )
            }));
            
            setStats(prev => ({
                totalDevices: devices.length,
                activeDevices: activeCount,
                alertsToday: totalWarningsToday
            }));
        } catch (error) {
            console.error('Error fetching device data:', error);
        }
    };

    // Replace the old periodic update useEffect with this new one
    useEffect(() => {
        if (!devices.length) return;

        // Initial fetch
        fetchDeviceData();

        // Set up periodic updates
        const intervalId = setInterval(fetchDeviceData, 5000); // Update every 5 seconds

        return () => clearInterval(intervalId);
    }, [devices]);

    // Add cleanup for warning listeners
    useEffect(() => {
        return () => {
            const db = getDatabase();
            // Clean up all warning listeners
            Object.entries(warningListeners).forEach(([deviceId, listener]) => {
                const warningRef = ref(db, `devices/${deviceId}/warning`);
                off(warningRef, listener);
            });
            setWarningListeners({});
        };
    }, []);

    const handleDeviceClick = (deviceId) => {
        navigate(`/device/${deviceId}`);
    };

    const handleAddDevice = () => {
        navigate('/manage-devices');
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleContactSubmit = async (values) => {
        setIsSubmitting(true);
        try {
            const templateParams = {
                from_name: values.name,
                from_email: values.email,
                message: values.message,
            };

            await emailjs.send(
                'service_zbhd07p', // Replace with your EmailJS service ID
                'template_0iw66o9', // Replace with your EmailJS template ID
                templateParams,
                '6514CWFzELzPia5Wd' // Replace with your EmailJS public key
            );

            message.success('Tin nhắn đã được gửi thành công!');
            setIsContactModalVisible(false);
            form.resetFields();
        } catch (error) {
            console.error('Error sending email:', error);
            message.error('Có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại sau.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredDevices = devices.filter(deviceId => 
        deviceNames[deviceId]?.toLowerCase().includes(searchText.toLowerCase())
    );

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
        <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-300">
            <Navbar onLogout={handleLogout}/>
            
            <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center">
                {/* Header Section */}
                <div className="text-center mb-8 mt-12 md:mt-16 px-4 w-full">
                    <AntTitle level={2} className="text-gray-800 text-xl sm:text-2xl md:text-3xl lg:text-4xl break-words">
                        <span className="font-bold block sm:inline">Xin chào, </span>
                        <span className="text-blue-600 block sm:inline mt-2 sm:mt-0">{username || 'User'}</span>
                    </AntTitle>
                </div>

                {/* Statistics Section */}
                <div className="w-full max-w-6xl mx-auto mb-8 px-4">
                    <div className="grid grid-cols-3 gap-2 md:gap-4">
                        <Card 
                            hoverable 
                            className="text-center shadow-lg hover:shadow-xl transition-all duration-300 glassmorphism p-1 md:p-3"
                            bodyStyle={{ padding: '8px' }}
                        >
                            <Statistic 
                                title={<span className="hidden md:inline-block text-sm font-medium">Thiết bị</span>}
                                value={stats.totalDevices}
                                prefix={<HomeOutlined className="text-blue-500 text-xl md:text-lg" />}
                                valueStyle={{ 
                                    fontSize: '1.25rem',
                                    lineHeight: 1.2,
                                    margin: 0
                                }}
                            />
                        </Card>
                        <Card 
                            hoverable 
                            className="text-center shadow-lg hover:shadow-xl transition-all duration-300 glassmorphism p-1 md:p-3"
                            bodyStyle={{ padding: '8px' }}
                        >
                            <Statistic 
                                title={<span className="hidden md:inline-block text-sm font-medium">Hoạt động</span>}
                                value={stats.activeDevices}
                                prefix={<AppstoreOutlined className="text-green-500 text-xl md:text-lg" />}
                                valueStyle={{ 
                                    fontSize: '1.25rem',
                                    lineHeight: 1.2,
                                    margin: 0
                                }}
                            />
                        </Card>
                        <Card 
                            hoverable 
                            className="text-center shadow-lg hover:shadow-xl transition-all duration-300 glassmorphism p-1 md:p-3"
                            bodyStyle={{ padding: '8px' }}
                        >
                            <Statistic 
                                title={<span className="hidden md:inline-block text-sm font-medium">Cảnh báo</span>}
                                value={stats.alertsToday}
                                prefix={<AlertOutlined className="text-red-500 text-xl md:text-lg" />}
                                valueStyle={{ 
                                    fontSize: '1.25rem',
                                    lineHeight: 1.2,
                                    margin: 0
                                }}
                            />
                        </Card>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mb-6 max-w-md w-full">
                    <Input
                        size="large"
                        placeholder="Tìm kiếm thiết bị..."
                        prefix={<SearchOutlined className="text-gray-400" />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="rounded-lg shadow-sm glassmorphism border-0"
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.25)',
                            backdropFilter: 'blur(10px)',
                        }}
                    />
                </div>

                {/* Devices List */}
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
                        {filteredDevices.map(deviceId => (
                            <div className="w-full sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)] min-w-[280px] flex items-center justify-center" key={deviceId}>
                                <Badge count={getWarningsCount(deviceId)} size="large" offset={[-10, 10]}>
                                    <DeviceCard
                                        deviceId={deviceId}
                                        deviceName={deviceNames[deviceId]}
                                        onClick={() => handleDeviceClick(deviceId)}
                                    />
                                </Badge>
                            </div>
                        ))}
                        <div className="w-full sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)] min-w-[280px] flex items-center justify-center">
                            <DeviceCard
                                isAddCard
                                onClick={handleAddDevice}
                            />
                        </div>
                        {/* Add empty placeholder divs to maintain grid on larger screens */}
                        {[...Array((4 - ((filteredDevices.length + 1) % 4)) % 4)].map((_, index) => (
                            <div key={`empty-${index}`} className="hidden lg:block lg:w-[calc(25%-12px)] min-w-[280px]" />
                        ))}
                    </div>
                </div>
            </div>

            {/* Replace the custom floating button with this */}
            <FloatButton
                tooltip="Liên hệ hỗ trợ"
                icon={<CustomerServiceOutlined />}
                onClick={() => setIsContactModalVisible(true)}
                type="primary"
            />

            {/* Contact Modal */}
            <Modal
                title={
                    <div className="text-center text-xl font-semibold text-gray-800 pb-4">
                        <CustomerServiceOutlined className="mr-2 text-blue-500" />
                        Liên hệ hỗ trợ
                    </div>
                }
                open={isContactModalVisible}
                onCancel={() => setIsContactModalVisible(false)}
                footer={null}
                width={480}
                className="custom-modal glassmorphism"
                centered
                maskStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                    backdropFilter: 'blur(4px)'
                }}
                styles={{
                    content: {
                        background: 'rgba(255, 255, 255, 0.3)',
                        backdropFilter: 'blur(5px)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.8)',
                    },
                    mask: {
                        backdropFilter: 'blur(4px)'
                    },
                    header: {
                        background: 'transparent',
                        border: 'none',
                        paddingBottom: 0,
                    },
                    body: {
                        padding: '24px',
                    }
                }}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleContactSubmit}
                    className="contact-form"
                    disabled={isSubmitting}
                >
                    <Form.Item
                        name="name"
                        label={
                            <span className="text-gray-700 font-medium">
                                Họ và tên
                            </span>
                        }
                        rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
                    >
                        <AntInput 
                            prefix={<UserOutlined className="text-gray-400" />}
                            className="rounded-lg glassmorphism-input"
                            size="large"
                            placeholder="Nhập họ và tên của bạn"
                            style={{
                                background: 'rgba(255, 255, 255, 0.6)',
                                backdropFilter: 'blur(4px)',
                            }}
                        />
                    </Form.Item>
                    <Form.Item
                        name="email"
                        label={
                            <span className="text-gray-700 font-medium">
                                Email
                            </span>
                        }
                        rules={[
                            { required: true, message: 'Vui lòng nhập email!' },
                            { type: 'email', message: 'Email không hợp lệ!' }
                        ]}
                    >
                        <AntInput 
                            prefix={<MailOutlined className="text-gray-400" />}
                            className="rounded-lg glassmorphism-input"
                            size="large"
                            placeholder="Nhập địa chỉ email của bạn"
                            style={{
                                background: 'rgba(255, 255, 255, 0.6)',
                                backdropFilter: 'blur(4px)',
                            }}
                        />
                    </Form.Item>
                    <Form.Item
                        name="message"
                        label={
                            <span className="text-gray-700 font-medium">
                                Nội dung
                            </span>
                        }
                        rules={[{ required: true, message: 'Vui lòng nhập nội dung!' }]}
                    >
                        <AntInput.TextArea 
                            className="rounded-lg glassmorphism-input"
                            rows={4}
                            placeholder="Nhập nội dung cần hỗ trợ"
                            style={{
                                background: 'rgba(255, 255, 255, 0.6)',
                                backdropFilter: 'blur(14px)',
                            }}
                        />
                    </Form.Item>
                    <Form.Item className="mb-0">
                        <div className="flex justify-center gap-4">
                            <Button 
                                onClick={() => setIsContactModalVisible(false)}
                                size="large"
                                icon={<CloseOutlined />}
                                className="min-w-[120px] rounded-lg glassmorphism-button"
                                disabled={isSubmitting}
                            >
                                Hủy
                            </Button>
                            <Button 
                                type="primary" 
                                htmlType="submit"
                                size="large"
                                icon={<SendOutlined />}
                                className="min-w-[120px] rounded-lg bg-blue-500 hover:bg-blue-600 border-blue-500 hover:border-blue-600"
                                loading={isSubmitting}
                                disabled={isSubmitting}
                            >
                                Gửi
                            </Button>
                        </div>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Home;
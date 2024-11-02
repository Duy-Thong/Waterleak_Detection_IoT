import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get } from "firebase/database";
import { useUser } from '../../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { Typography, Input, Tooltip, Row, Col, Modal, Form, Input as AntInput, Button, message, Badge } from 'antd';
import { SearchOutlined, AppstoreOutlined, AlertOutlined, HomeOutlined, CustomerServiceOutlined } from '@ant-design/icons';
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
        return (now - lastActivity) < 60000; // 60000 ms = 1 minute
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

    // Modified periodic update
    useEffect(() => {
        if (!devices.length) return;

        const updateActiveDevices = () => {
            const activeCount = Object.values(deviceStatuses)
                .filter(status => isDeviceActive(status.data))
                .length;

            setStats(prev => ({
                ...prev,
                activeDevices: activeCount
            }));
        };

        const intervalId = setInterval(updateActiveDevices, 1000); // Update every 10 seconds

        return () => clearInterval(intervalId);
    }, [devices, deviceStatuses]);

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

    const handleContactSubmit = async (values) => {
        try {
            const templateParams = {
                from_name: values.name,
                from_email: values.email,
                message: values.message,
            };

            await emailjs.send(
                'service_qy5jnnk', // Replace with your EmailJS service ID
                'template_0ijrgfo', // Replace with your EmailJS template ID
                templateParams,
                '6514CWFzELzPia5Wd' // Replace with your EmailJS public key
            );

            message.success('Tin nhắn đã được gửi thành công!');
            setIsContactModalVisible(false);
            form.resetFields();
        } catch (error) {
            console.error('Error sending email:', error);
            message.error('Có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại sau.');
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
                <div className="text-center mb-8 mt-16">
                    <AntTitle level={2} className="text-gray-800">
                        <span className="font-bold">Xin chào, </span>
                        <span className="text-blue-600">{username || 'User'}</span>
                    </AntTitle>
                </div>

                {/* Statistics Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mx-auto mb-12 px-4">
                    <Card hoverable className="text-center shadow-lg hover:shadow-xl transition-all duration-300 min-w-[280px] glassmorphism">
                        <Statistic 
                            title={<span className="text-lg font-medium">Tổng số thiết bị</span>}
                            value={stats.totalDevices}
                            prefix={<HomeOutlined className="text-blue-500 text-xl" />}
                        />
                    </Card>
                    <Card hoverable className="text-center shadow-lg hover:shadow-xl transition-all duration-300 min-w-[280px] glassmorphism">
                        <Statistic 
                            title={<span className="text-lg font-medium">Thiết bị đang hoạt động</span>}
                            value={stats.activeDevices}
                            prefix={<AppstoreOutlined className="text-green-500 text-xl" />}
                        />
                    </Card>
                    <Card hoverable className="text-center shadow-lg hover:shadow-xl transition-all duration-300 min-w-[280px] glassmorphism">
                        <Statistic 
                            title={<span className="text-lg font-medium">Cảnh báo hôm nay</span>}
                            value={stats.alertsToday}
                            prefix={<AlertOutlined className="text-red-500 text-xl" />}
                        />
                    </Card>
                </div>

                {/* Search Bar */}
                <div className="mb-6 max-w-md w-full">
                    <Input
                        size="large"
                        placeholder="Tìm kiếm thiết bị..."
                        prefix={<SearchOutlined className="text-gray-400" />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="rounded-lg shadow-sm"
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

            {/* Floating Contact Button */}
            <div className="fixed bottom-8 right-8 flex flex-col gap-4">
                <Tooltip title="Liên hệ hỗ trợ" placement="left">
                    <button
                        onClick={() => setIsContactModalVisible(true)}
                        className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors"
                    >
                        <CustomerServiceOutlined style={{ fontSize: '24px' }} />
                    </button>
                </Tooltip>
            </div>

            {/* Contact Modal */}
            <Modal
                title="Liên hệ hỗ trợ"
                open={isContactModalVisible}
                onCancel={() => setIsContactModalVisible(false)}
                footer={null}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleContactSubmit}
                >
                    <Form.Item
                        name="name"
                        label="Họ và tên"
                        rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
                    >
                        <AntInput />
                    </Form.Item>
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { required: true, message: 'Vui lòng nhập email!' },
                            { type: 'email', message: 'Email không hợp lệ!' }
                        ]}
                    >
                        <AntInput />
                    </Form.Item>
                    <Form.Item
                        name="message"
                        label="Nội dung"
                        rules={[{ required: true, message: 'Vui lòng nhập nội dung!' }]}
                    >
                        <AntInput.TextArea rows={4} />
                    </Form.Item>
                    <Form.Item>
                        <div className="flex justify-end gap-2">
                            <Button onClick={() => setIsContactModalVisible(false)}>
                                Hủy
                            </Button>
                            <Button type="primary" htmlType="submit">
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

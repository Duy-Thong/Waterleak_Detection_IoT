import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get } from "firebase/database";
import { useUser } from '../../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { Typography, Input, Tooltip, Row, Col, Modal, Form, Input as AntInput, Button, message } from 'antd';
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
                        setStats({
                            totalDevices: userDevices.length,
                            activeDevices: userDevices.length, // You can modify this based on actual active status
                            alertsToday: 0 // You can fetch real alerts count
                        });

                        // Fetch device names
                        userDevices.forEach(deviceId => {
                            const deviceRef = ref(db, `devices/${deviceId}`);
                            get(deviceRef).then((deviceSnapshot) => {
                                if (deviceSnapshot.exists()) {
                                    const deviceData = deviceSnapshot.val();
                                    setDeviceNames(prev => ({
                                        ...prev,
                                        [deviceId]: deviceData.name || deviceId
                                    }));
                                }
                            });
                        });
                    }
                })
                .catch((error) => {
                    setError("Không thể tải dữ liệu. Vui lòng thử lại sau.");
                })
                .finally(() => setLoading(false));
        }
    }, [userId]);

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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
            <Navbar onLogout={handleLogout}/>
            
            <div className="container mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="text-center mb-8 mt-16">
                    <AntTitle level={2} className="text-gray-800">
                        <span className="font-bold">Xin chào, </span>
                        <span className="text-blue-600">{username || 'User'}</span>
                    </AntTitle>
                </div>

                {/* Statistics Section */}
                <Row gutter={[16, 16]} className="mb-8">
                    <Col xs={24} sm={8}>
                        <Card hoverable className="text-center shadow-md">
                            <Statistic 
                                title="Tổng số thiết bị"
                                value={stats.totalDevices}
                                prefix={<HomeOutlined className="text-blue-500" />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card hoverable className="text-center shadow-md">
                            <Statistic 
                                title="Thiết bị đang hoạt động"
                                value={stats.activeDevices}
                                prefix={<AppstoreOutlined className="text-green-500" />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card hoverable className="text-center shadow-md">
                            <Statistic 
                                title="Cảnh báo hôm nay"
                                value={stats.alertsToday}
                                prefix={<AlertOutlined className="text-red-500" />}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* Search Bar */}
                <div className="mb-6 max-w-md mx-auto">
                    <Input
                        size="large"
                        placeholder="Tìm kiếm thiết bị..."
                        prefix={<SearchOutlined className="text-gray-400" />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="rounded-lg shadow-sm"
                    />
                </div>

                {/* Devices List - Changed to Flex */}
                <div className="max-w-5xl mx-auto">
                    <div className="flex flex-wrap justify-center gap-4">
                        {filteredDevices.map(deviceId => (
                            <div className="w-[280px]" key={deviceId}>
                                <DeviceCard
                                    deviceId={deviceId}
                                    deviceName={deviceNames[deviceId]}
                                    onClick={() => handleDeviceClick(deviceId)}
                                />
                            </div>
                        ))}
                        <div className="w-[280px]">
                            <DeviceCard
                                isAddCard
                                onClick={handleAddDevice}
                            />
                        </div>
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

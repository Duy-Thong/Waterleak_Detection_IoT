import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Typography, Statistic, Tabs, Avatar, Tag, Button, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { UserOutlined, EnvironmentOutlined, GoogleOutlined, MailOutlined, LogoutOutlined, EditOutlined, DeleteOutlined, PlusOutlined, WarningOutlined, DropboxSquareFilled, ApiOutlined } from '@ant-design/icons';
import { ref, get, set, remove, update } from 'firebase/database';
import { database } from '../../firebase';
import { getAuth, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/ptit.jpg';
import './style.css'
import warning from 'antd/es/_util/warning';
const { Title } = Typography;
const { TabPane } = Tabs;
const DEFAULT_AVATAR = "https://vubtdxs1af4oyipf.public.blob.vercel-storage.com/default-zVurvnaf5BB60xeRyq39N7y707FtU6.png";

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [devices, setDevices] = useState([]);
    const [isUserModalVisible, setIsUserModalVisible] = useState(false);
    const [isDeviceModalVisible, setIsDeviceModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editingDevice, setEditingDevice] = useState(null);
    const [isUserInfoModalVisible, setIsUserInfoModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [form] = Form.useForm();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeletingUser, setIsDeletingUser] = useState(null);
    const [isDeletingDevice, setIsDeletingDevice] = useState(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const auth = getAuth();
            const user = auth.currentUser;
            const savedUserId = localStorage.getItem('userId');
            
            // If no current user but have saved ID, wait for Firebase Auth to initialize
            if (!user && savedUserId) {
                // Wait for Firebase Auth state to be ready
                const unsubscribe = auth.onAuthStateChanged(async (user) => {
                    if (!user) {
                        localStorage.removeItem('userId');
                        navigate('/admin/login');
                        return;
                    }
                    
                    // Check if user is admin
                    const userRef = ref(database, `users/${user.uid}`);
                    const snapshot = await get(userRef);
                    if (!snapshot.exists() || snapshot.val().role !== 'admin') {
                        localStorage.removeItem('userId');
                        navigate('/admin/login');
                        return;
                    }

                    fetchData();
                    unsubscribe();
                });
                return;
            }
            
            // No saved credentials, redirect to login
            if (!user) {
                navigate('/admin/login');
                return;
            }
            
            // Check if user is admin
            const userRef = ref(database, `users/${user.uid}`);
            const snapshot = await get(userRef);
            if (!snapshot.exists() || snapshot.val().role !== 'admin') {
                navigate('/admin/login');
                return;
            }

            // If auth check passes, fetch data
            fetchData();
        };

        checkAuth();
    }, [navigate]);

    const fetchData = async () => {
        try {
            const usersRef = ref(database, 'users');
            const devicesRef = ref(database, 'devices');

            const usersSnapshot = await get(usersRef);
            const devicesSnapshot = await get(devicesRef);

            if (usersSnapshot.exists()) {
                const userData = Object.entries(usersSnapshot.val()).map(([id, data]) => ({
                    key: id,
                    id: id,
                    name: data.username || 'N/A',
                    email: data.email || 'N/A',
                    role: data.role || 'user',
                    photoURL: data.photoURL || null,
                    createdAt: data.createdAt || 'N/A',
                    registrationMethod: data.registrationMethod || 'email'
                }));
                setUsers(userData);
            }

            if (devicesSnapshot.exists()) {
                const deviceData = await Promise.all(
                    Object.entries(devicesSnapshot.val()).map(async ([id, data]) => {
                        // Fetch warnings for this device
                        const warningsRef = ref(database, `devices/${id}/warning`);
                        const relayRef = ref(database, `devices/${id}/relay/control`);
                        
                        const [warningsSnapshot, relaySnapshot] = await Promise.all([
                            get(warningsRef),
                            get(relayRef)
                        ]);

                        const warningCount = warningsSnapshot.exists() ? 
                            Object.keys(warningsSnapshot.val()).length : 0;
                        
                        const relayStatus = relaySnapshot.exists() ? 
                            relaySnapshot.val() : "OFF"; // Default to "OFF" instead of false

                        return {
                            key: id,
                            id: id,
                            name: data.name || 'N/A',
                            warningCount,
                            relayStatus
                        };
                    })
                );
                setDevices(deviceData);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        const auth = getAuth();
        try {
            await signOut(auth);
            localStorage.removeItem('userId');
            navigate('/admin/login');
        } catch (error) {
            console.error("Lỗi đăng xuất:", error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    const handleAddUser = async (values) => {
        setIsSubmitting(true);
        try {
            // Check if email already exists in database
            const usersRef = ref(database, 'users');
            const usersSnapshot = await get(usersRef);
            
            if (usersSnapshot.exists()) {
                const users = Object.values(usersSnapshot.val());
                const emailExists = users.some(user => user.email === values.email);
                
                if (emailExists) {
                    message.error('Email đã được sử dụng');
                    return;
                }
            }

            // Create the auth user if email is unique
            const auth = getAuth();
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                values.email,
                values.password
            );

            // Firebase Auth will generate the UID automatically
            const userId = userCredential.user.uid;
            const newUserRef = ref(database, `users/${userId}`);
            
            await set(newUserRef, {
                username: values.name,
                email: values.email,
                role: values.role,
                registrationMethod: 'email',
                photoURL: DEFAULT_AVATAR,
                createdAt: new Date().toISOString()
            });

            message.success('Thêm người dùng thành công');
            setIsUserModalVisible(false);
            form.resetFields();
            fetchData();
        } catch (error) {
            // Firebase Auth already handles duplicate email errors, but we can make the message more friendly
            if (error.code === 'auth/email-already-in-use') {
                message.error('Email đã được sử dụng');
            } else {
                message.error('Lỗi khi thêm người dùng: ' + error.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditUser = async (values) => {
        setIsSubmitting(true);
        try {
            // Check if email already exists in database (excluding current user)
            const usersRef = ref(database, 'users');
            const usersSnapshot = await get(usersRef);
            
            if (usersSnapshot.exists()) {
                const users = Object.entries(usersSnapshot.val());
                const emailExists = users.some(([id, user]) => 
                    user.email === values.email && id !== editingUser.id
                );
                
                if (emailExists) {
                    message.error('Email đã được sử dụng bởi người dùng khác');
                    return;
                }
            }

            const userRef = ref(database, `users/${editingUser.id}`);
            await update(userRef, {
                username: values.name,
                email: values.email,
                role: values.role
            });
            
            message.success('Cập nhật người dùng thành công');
            setIsUserModalVisible(false);
            setEditingUser(null);
            form.resetFields();
            fetchData();
        } catch (error) {
            message.error('Lỗi khi cập nhật người dùng: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        setIsDeletingUser(userId);
        try {
            const userRef = ref(database, `users/${userId}`);
            await remove(userRef);
            message.success('Xóa người dùng thành công');
            fetchData();
        } catch (error) {
            message.error('Lỗi khi xóa người dùng');
        } finally {
            setIsDeletingUser(null);
        }
    };

    const handleAddDevice = async (values) => {
        setIsSubmitting(true);
        try {
            // Validate device ID format
            const deviceId = values.id.trim();
            if (!deviceId) {
                message.error('Mã thiết bị không được để trống');
                return;
            }

            // Check if device ID already exists
            const deviceRef = ref(database, `devices/${deviceId}`);
            const deviceSnapshot = await get(deviceRef);
            
            if (deviceSnapshot.exists()) {
                message.error('Mã thiết bị đã tồn tại');
                return;
            }

            // Initialize device with proper structure
            await set(deviceRef, {
                name: values.name.trim(),
                flow_sensor: {
                    current: 0,
                    threshold: 100
                },
                warning: null,
                relay: {
                    control: "OFF",
                    status: "OFF"
                },
                createdAt: new Date().toISOString()
            });
            
            message.success('Thêm thiết bị thành công');
            setIsDeviceModalVisible(false);
            form.resetFields();
            fetchData();
        } catch (error) {
            console.error("Error adding device:", error);
            message.error('Lỗi khi thêm thiết bị: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditDevice = async (values) => {
        setIsSubmitting(true);
        try {
            if (!editingDevice?.id) {
                message.error('Không tìm thấy ID thiết bị');
                return;
            }

            const deviceRef = ref(database, `devices/${editingDevice.id}`);
            const deviceSnapshot = await get(deviceRef);
            
            if (!deviceSnapshot.exists()) {
                message.error('Không tìm thấy thiết bị');
                return;
            }

            await update(deviceRef, {
                name: values.name.trim()
            });

            message.success('Cập nhật thiết bị thành công');
            setIsDeviceModalVisible(false);
            setEditingDevice(null);
            form.resetFields();
            fetchData();
        } catch (error) {
            console.error("Error updating device:", error);
            message.error('Lỗi khi cập nhật thiết bị: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteDevice = async (deviceId) => {
        setIsDeletingDevice(deviceId);
        try {
            const deviceRef = ref(database, `devices/${deviceId}`);
            await remove(deviceRef);
            message.success('Xóa thiết bị thành công');
            fetchData();
        } catch (error) {
            message.error('Lỗi khi xóa thiết bị');
        } finally {
            setIsDeletingDevice(null);
        }
    };

    const userColumns = [
        {
            title: 'Ảnh',
            key: 'avatar',
            width: 80,
            align: 'center',
            responsive: ['sm'],
            render: (text, record) => (
                <Avatar 
                    src={record.photoURL} 
                    icon={!record.photoURL && <UserOutlined />}
                    className="cursor-pointer hover:opacity-80"
                    onClick={() => {
                        setSelectedUser(record);
                        setIsUserInfoModalVisible(true);
                    }}
                />
            ),
        },
        {
            title: 'Tên người dùng',
            dataIndex: 'name',
            key: 'name',
            width: 120,
            filterSearch: true,
            filters: users.map(user => ({
                text: user.name,
                value: user.id, // Use user.id as value instead of name
                key: `name-${user.id}` // Add unique key
            })),
            onFilter: (value, record) => record.id === value, // Update filter logic
            sorter: (a, b) => a.name.localeCompare(b.name),
            sortDirections: ['ascend', 'descend'],
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            width: 200,
            responsive: ['sm'],
            filterSearch: true,
            filters: users.map(user => ({
                text: user.email,
                value: user.id, // Use user.id as value
                key: `email-${user.id}` // Add unique key
            })),
            onFilter: (value, record) => record.id === value, // Update filter logic
            sorter: (a, b) => a.email.localeCompare(b.email),
            sortDirections: ['ascend', 'descend'],
        },
        {
            title: 'Đăng ký',
            dataIndex: 'registrationMethod',
            key: 'registrationMethod',
            width: 120,
            responsive: ['md'],
            filters: [
                { text: 'Google', value: 'google' },
                { text: 'Email', value: 'email' },
            ],
            onFilter: (value, record) => record.registrationMethod === value,
            sorter: (a, b) => a.registrationMethod.localeCompare(b.registrationMethod),
            sortDirections: ['ascend', 'descend'],
            render: (method) => {
                const styles = {
                    google: {
                        color: '#DB4437',
                        border: '1px solid #DB4437',
                        backgroundColor: 'rgba(255, 255, 255, 0.5)'
                    },
                    email: {
                        color: '#4285F4',
                        border: '1px solid #4285F4',  // Fixed syntax error here
                        backgroundColor: 'rgba(255, 255, 255, 0.5)'
                    }
                };
            
                return (
                    <Tag style={method === 'google' ? styles.google : styles.email}>
                        {method === 'google' ? 'Google' : 'Email'}
                    </Tag>
                );
            }
        },
        {
            title: 'Ngày đăng ký',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 180,
            responsive: ['lg'],
            filters: [
                { text: 'Hôm nay', value: 'today' },
                { text: 'Tuần này', value: 'week' },
                { text: 'Tháng này', value: 'month' },
                { text: 'Năm nay', value: 'year' },
            ],
            onFilter: (value, record) => {
                if (!record.createdAt || record.createdAt === 'N/A') return false;
                const recordDate = new Date(record.createdAt);
                const today = new Date();
                
                switch(value) {
                    case 'today':
                        return recordDate.toDateString() === today.toDateString();
                    case 'week':
                        const weekAgo = new Date(today.setDate(today.getDate() - 7));
                        return recordDate >= weekAgo;
                    case 'month':
                        return recordDate.getMonth() === today.getMonth() 
                            && recordDate.getFullYear() === today.getFullYear();
                    case 'year':
                        return recordDate.getFullYear() === today.getFullYear();
                    default:
                        return true;
                }
            },
            sorter: (a, b) => {
                if (a.createdAt === 'N/A') return -1;
                if (b.createdAt === 'N/A') return 1;
                return new Date(a.createdAt) - new Date(b.createdAt);
            },
            sortDirections: ['ascend', 'descend'],
            render: (dateStr) => {
                if (!dateStr || dateStr === 'N/A') return 'N/A';
                try {
                    const date = new Date(dateStr);
                    return date.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                } catch (error) {
                    console.error("Date parsing error:", error);
                    return 'Invalid Date';
                }
            }
        },
        {
            title: 'Vai trò',
            dataIndex: 'role',
            key: 'role',
            width: 100,
            filters: [
                { text: 'Admin', value: 'admin' },
                { text: 'User', value: 'user' },
            ],
            onFilter: (value, record) => record.role === value,
            sorter: (a, b) => a.role.localeCompare(b.role),
            sortDirections: ['ascend', 'descend'],
            render: (role) => (
                <Tag color={role === 'admin' ? 'blue' : 'green'}>
                    {role === 'admin' ? 'Admin' : 'User'}
                </Tag>
            )
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 100,
            fixed: 'right',
            render: (_, record) => (
                <div className="flex gap-2 justify-center">
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => {
                            setEditingUser(record);
                            form.setFieldsValue(record);
                            setIsUserModalVisible(true);
                        }}
                        loading={isSubmitting && editingUser?.id === record.id}
                    />
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa?"
                        onConfirm={() => handleDeleteUser(record.id)}
                    >
                        <Button 
                            type="primary" 
                            danger 
                            icon={<DeleteOutlined />} 
                            size="small"
                            loading={isDeletingUser === record.id} 
                        />
                    </Popconfirm>
                </div>
            )
        }
    ];

    const deviceColumns = [
        {
            title: 'Mã thiết bị',
            dataIndex: 'id',
            key: 'id',
            width: 120,
            filterSearch: true,
            filters: devices.map(device => ({
                text: device.id,
                value: device.id,
            })),
            onFilter: (value, record) => record.id.indexOf(value) === 0,
            responsive: ['sm'],
            sorter: (a, b) => a.id.localeCompare(b.id),
            sortDirections: ['ascend', 'descend'],
        },
        {
            title: 'Tên thiết bị',
            dataIndex: 'name',
            key: 'name',
            width: 150,
            filterSearch: true,
            filters: devices.map(device => ({
                text: device.name,
                value: device.name,
            })),
            onFilter: (value, record) => record.name.indexOf(value) === 0,
            sorter: (a, b) => a.name.localeCompare(b.name),
            sortDirections: ['ascend', 'descend'],
        },
        {
            title: 'Cảnh báo',
            dataIndex: 'warningCount',
            key: 'warningCount',
            width: 120,
            render: (count) => (
                <Tag color={count > 0 ? 'red' : 'green'}>
                    {count} cảnh báo
                </Tag>
            ),
            sorter: (a, b) => a.warningCount - b.warningCount,
            sortDirections: ['ascend', 'descend'],
            responsive: ['sm'],
        },
        {
            title: 'Relay',
            dataIndex: 'relayStatus',
            key: 'relayStatus',
            width: 100,
            render: (status) => (
                <Tag color={status === "ON" ? 'green' : 'red'}>
                    {status}
                </Tag>
            ),
            filters: [
                { text: 'BẬT', value: "ON" },
                { text: 'TẮT', value: "OFF" },
            ],
            onFilter: (value, record) => record.relayStatus === value,
            sorter: (a, b) => a.relayStatus.localeCompare(b.relayStatus),
            sortDirections: ['ascend', 'descend'],
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 100,
            fixed: 'right',
            render: (_, record) => (
                <div className="flex gap-2 justify-center">
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => {
                            setEditingDevice(record);
                            form.setFieldsValue(record);
                            setIsDeviceModalVisible(true);
                        }}
                        loading={isSubmitting && editingDevice?.id === record.id}
                    />
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa?"
                        onConfirm={() => handleDeleteDevice(record.id)}
                    >
                        <Button 
                            type="primary" 
                            danger 
                            icon={<DeleteOutlined />} 
                            size="small"
                            loading={isDeletingDevice === record.id}
                        />
                    </Popconfirm>
                </div>
            )
        }
    ];
    
    const tabItems = [
        {
            key: '1',
            label: <span className="text-blue-900 font-medium">Quản lý người dùng</span>,
            children: (
                <div className="overflow-x-auto">
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            setEditingUser(null);
                            form.resetFields();
                            setIsUserModalVisible(true);
                        }}
                        className="mb-4 outline-btn"
                        style={{
                            backgroundColor: 'white',
                            opacity: 0.5,
                            borderColor: '#1890ff',
                            color: 'blue'
                        }}
                    >
                        Thêm người dùng
                    </Button>
                    <Table
                        columns={userColumns}
                        dataSource={users}
                        loading={loading}
                        className="custom-table"
                        scroll={{ x: 'max-content' }}
                        pagination={{
                            className: "custom-pagination",
                            responsive: true,
                            showSizeChanger: true,
                            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} mục`,
                            pageSize: 10
                        }}
                    />
                </div>
            )
        },
        {
            key: '2',
            label: <span className="text-blue-900 font-medium">Quản lý thiết bị</span>,
            children: (
                <div className="overflow-x-auto">
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            setEditingDevice(null);
                            form.resetFields();
                            setIsDeviceModalVisible(true);
                        }}
                        className="mb-4 outline-btn"
                        style={{ 
                            backgroundColor: 'white',
                            opacity: 0.5,
                            borderColor: '#1890ff',
                            color: 'blue'
                        }}
                    >
                        Thêm thiết bị
                    </Button>
                    <Table
                        columns={deviceColumns}
                        dataSource={devices}
                        loading={loading}
                        className="custom-table"
                        scroll={{ x: 'max-content' }}
                        pagination={{
                            className: "custom-pagination",
                            responsive: true,
                            showSizeChanger: true,
                            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} mục`,
                            pageSize: 10
                        }}
                    />
                </div>
            )
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-300 to-green-100">
            {/* Responsive Navbar */}
            <div className="glassmorphism p-4 md:px-8 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <img src={logo} alt="PTIT Logo" className="h-8 md:h-10" />
                    <span className="text-blue-900 font-semibold text-lg md:text-xl hidden sm:inline"></span>
                </div>
                <Button 
                    type="link"
                    icon={<LogoutOutlined />}
                    onClick={handleLogout}
                    loading={isLoggingOut}
                    className="text-red-600 hover:text-red-800"
                >
                    <span className="hidden sm:inline">Đăng xuất</span>
                </Button>
            </div>

            <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
                <Title level={2} className="!text-white mb-6 md:mb-8 text-center md:text-left">
                    Bảng điều khiển
                </Title>
                
                {/* Statistics Cards */}
                <Row gutter={[16, 16]} className="mb-6">
                    <Col className='w-1/3'>
                        <Card className="glassmorphism h-full">
                            <Statistic
                                title={<span className="text-blue-900 font-semibold drop-shadow-md hidden sm:block">Tổng người dùng</span>}
                                value={users.length}
                                prefix={<UserOutlined className="text-green-500" />}
                                loading={loading}
                                valueStyle={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                            />
                        </Card>
                    </Col>
                    <Col className='w-1/3'>
                        <Card className="glassmorphism h-full">
                            <Statistic
                                title={<span className="text-blue-900 font-semibold drop-shadow-md hidden sm:block">Tổng thiết bị</span>}
                                value={devices.length}
                                prefix={<ApiOutlined className="text-blue-500" />}
                                loading={loading}
                                valueStyle={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                            />
                        </Card>
                    </Col>
                    <Col className='w-1/3'>
                        <Card className="glassmorphism h-full">
                            <Statistic
                                title={<span className="text-blue-900 font-semibold drop-shadow-md hidden sm:block">Tổng cảnh báo</span>}
                                value={devices.reduce((sum, device) => sum + device.warningCount, 0)}
                                prefix={<WarningOutlined className="text-red-500" />}
                                loading={loading}
                                valueStyle={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* Main Content Tabs */}
                <Card className="glassmorphism !bg-white/30">
                    <Tabs 
                        defaultActiveKey="1"
                        items={tabItems}
                        className="admin-tabs"
                        tabBarStyle={{ 
                            marginBottom: 24,
                            color: '#1e3a8a',
                            borderBottom: '1px solid rgba(30, 58, 138, 0.3)'
                        }}
                    />
                </Card>

                {/* User Modal */}
                <Modal
                    title={editingUser ? "Sửa người dùng" : "Thêm người dùng"}
                    open={isUserModalVisible}
                    onCancel={() => {
                        setIsUserModalVisible(false);
                        setEditingUser(null);
                        form.resetFields();
                    }}
                    footer={null}
                >
                    <Form
                        form={form}
                        onFinish={editingUser ? handleEditUser : handleAddUser}
                        layout="vertical"
                    >
                        {/* Remove the ID Form.Item since it's auto-generated */}
                        <Form.Item
                            name="name"
                            label="Tên người dùng"
                            rules={[{ required: true }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="email"
                            label="Email"
                            rules={[{ required: true, type: 'email' }]}
                        >
                            <Input />
                        </Form.Item>
                        {!editingUser && (
                            <Form.Item
                                name="password"
                                label="Mật khẩu"
                                rules={[
                                    { required: true, message: 'Vui lòng nhập mật khẩu' },
                                    { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }
                                ]}
                            >
                                <Input.Password />
                            </Form.Item>
                        )}
                        <Form.Item
                            name="role"
                            label="Vai trò"
                            rules={[{ required: true }]}
                        >
                            <Select>
                                <Select.Option value="admin">Quản trị viên</Select.Option>
                                <Select.Option value="user">Người dùng</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={isSubmitting}>
                                {editingUser ? "Cập nhật" : "Thêm"}
                            </Button>
                        </Form.Item>
                    </Form>
                </Modal>

                {/* Device Modal */}
                <Modal
                    title={editingDevice ? "Sửa thiết bị" : "Thêm thiết bị"}
                    open={isDeviceModalVisible}
                    onCancel={() => {
                        setIsDeviceModalVisible(false);
                        setEditingDevice(null);
                        form.resetFields();
                    }}
                    footer={null}
                >
                    <Form
                        form={form}
                        onFinish={editingDevice ? handleEditDevice : handleAddDevice}
                        layout="vertical"
                    >
                        <Form.Item
                            name="id"
                            label="Mã thiết bị"
                            rules={[
                                { required: true, message: 'Vui lòng nhập mã thiết bị' },
                                { pattern: /^[A-Za-z0-9-_]+$/, message: 'Mã thiết bị chỉ được chứa chữ cái, số, gạch ngang và gạch dưới' },
                                { min: 3, message: 'Mã thiết bị phải có ít nhất 3 ký tự' },
                                {max:30 , message: 'Mã thiết bị không được vượt quá 30 ký tự' }
                            ]}
                        >
                            <Input disabled={!!editingDevice} placeholder="Nhập mã thiết bị" />
                        </Form.Item>
                        <Form.Item
                            name="name"
                            label="Tên thiết bị"
                            rules={[
                                { required: true, message: 'Vui lòng nhập tên thiết bị' },
                                { min: 3, message: 'Tên thiết bị phải có ít nhất 3 ký tự' },
                                { max: 50, message: 'Tên thiết bị không được vượt quá 50 ký tự' }
                            ]}
                        >
                            <Input placeholder="Nhập tên thiết bị" />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={isSubmitting}>
                                {editingDevice ? "Cập nhật" : "Thêm"}
                            </Button>
                        </Form.Item>
                    </Form>
                </Modal>

                {/* User Info Modal */}
                <Modal
                    title={
                        <div className="flex items-center gap-3">
                            <UserOutlined className="text-blue-500" />
                            <span>Thông tin người dùng</span>
                        </div>
                    }
                    open={isUserInfoModalVisible}
                    onCancel={() => {
                        setIsUserInfoModalVisible(false);
                        setSelectedUser(null);
                    }}
                    footer={null}
                    width={400}
                >
                    {selectedUser && (
                        <div className="space-y-6">
                            <div className="flex flex-col items-center gap-3 pb-4 border-b">
                                <Avatar 
                                    size={100} 
                                    src={selectedUser.photoURL}
                                    icon={!selectedUser.photoURL && <UserOutlined />}
                                    className="shadow-lg"
                                />
                                <div className="text-center">
                                    <h3 className="text-xl font-semibold text-gray-800">
                                        {selectedUser.name}
                                    </h3>
                                    <Tag color={selectedUser.role === 'admin' ? 'blue' : 'green'}>
                                        {selectedUser.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                                    </Tag>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-gray-50 p-3 rounded-lg flex items-start gap-3">
                                    <MailOutlined className="text-blue-500 mt-0.5" />
                                    <div>
                                        <div className="text-xs text-gray-500">Email</div>
                                        <div className="font-medium text-gray-700">{selectedUser.email}</div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg flex items-start gap-3">
                                    <GoogleOutlined className="text-blue-500 mt-0.5" />
                                    <div>
                                        <div className="text-xs text-gray-500">Phương thức đăng ký</div>
                                        <Tag 
                                            className="mt-1"
                                            color={selectedUser.registrationMethod === 'google' ? '#DB4437' : '#4285F4'}
                                        >
                                            {selectedUser.registrationMethod === 'google' ? 'Google' : 'Email'}
                                        </Tag>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg flex items-start gap-3">
                                    <UserOutlined className="text-blue-500 mt-0.5" />
                                    <div>
                                        <div className="text-xs text-gray-500">Ngày đăng ký</div>
                                        <div className="font-medium text-gray-700">
                                            {selectedUser.createdAt !== 'N/A' 
                                                ? new Date(selectedUser.createdAt).toLocaleDateString('vi-VN', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })
                                                : 'N/A'
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal>
            </div>
        </div>
    );
};

export default AdminDashboard;
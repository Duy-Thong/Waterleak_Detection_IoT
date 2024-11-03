import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get, remove, update } from 'firebase/database';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { Input, Button, List, Form, Modal, notification } from 'antd';
import Navbar from '../components/Navbar';
import './style.css'; // Đảm bảo import file CSS
import RequireLogin from '../components/RequireLogin';

const ManageDevices = () => {
    const [devices, setDevices] = useState([]); // Will now store array of {id, name} objects
    const [newDeviceId, setNewDeviceId] = useState('');
    const [deviceToRemove, setDeviceToRemove] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const { userId, logout } = useUser();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDevices = async () => {
            const db = getDatabase();
            const userDevicesRef = ref(db, 'users/' + userId + '/devices');
            const devicesRef = ref(db, 'devices');

            try {
                const [userSnapshot, devicesSnapshot] = await Promise.all([
                    get(userDevicesRef),
                    get(devicesRef)
                ]);

                if (userSnapshot.exists() && devicesSnapshot.exists()) {
                    const userDevices = userSnapshot.val();
                    const allDevices = devicesSnapshot.val();
                    
                    const deviceList = Object.keys(userDevices).map(deviceId => ({
                        id: deviceId,
                        name: allDevices[deviceId]?.name || 'Unnamed Device'
                    }));
                    
                    setDevices(deviceList);
                } else {
                    setDevices([]);
                }
            } catch (error) {
                console.error("Error fetching devices:", error);
                
            }
        };

        fetchDevices();
    }, [userId]);

    const handleRemoveDevice = async () => {
        const db = getDatabase();
        try {
            await remove(ref(db, `users/${userId}/devices/${deviceToRemove}`));
            setDevices(devices.filter(device => device.id !== deviceToRemove));
            notification.success({
                message: 'Thành công',
                description: 'Hủy liên kết với thiết bị thành công',
                placement: 'topRight'
            });
            setIsModalVisible(false);
        } catch (error) {
            console.error("Lỗi khi xóa thiết bị:", error);
            notification.error({
                message: 'Lỗi',
                description: 'Có lỗi khi xóa thiết bị. Vui lòng thử lại.',
                placement: 'topRight'
            });
        }
    };

    const showRemoveConfirm = (deviceId) => {
        setDeviceToRemove(deviceId);
        setIsModalVisible(true);
    };

    const handleAddDevice = async (values) => {
        const { deviceId } = values;
        const db = getDatabase();

        try {
            const devicesRef = ref(db, 'devices');
            const devicesSnapshot = await get(devicesRef);

            if (!devicesSnapshot.exists()) {
                notification.warning({
                    message: 'Cảnh báo',
                    description: 'Không có thiết bị nào có sẵn để đăng ký.',
                    placement: 'topRight'
                });
                return;
            }

            const availableDevices = devicesSnapshot.val();

            if (!availableDevices[deviceId]) {
                notification.warning({
                    message: 'Cảnh báo',
                    description: 'Không tìm thấy ID thiết bị trong danh sách thiết bị có sẵn.',
                    placement: 'topRight'
                });
                return;
            }

            const userDevicesRef = ref(db, `users/${userId}/devices`);
            const userDevicesSnapshot = await get(userDevicesRef);
            const userDevices = userDevicesSnapshot.exists() ? userDevicesSnapshot.val() : {};

            if (userDevices[deviceId]) {
                notification.warning({
                    message: 'Cảnh báo',
                    description: 'ID thiết bị đã tồn tại trong danh sách thiết bị của bạn.',
                    placement: 'topRight'
                });
                return;
            }

            await update(userDevicesRef, {
                [deviceId]: true
            });
            setDevices([...devices, { id: deviceId, name: availableDevices[deviceId].name || 'Unnamed Device' }]);
            setNewDeviceId('');
            notification.success({
                message: 'Thành công',
                description: 'Thêm thiết bị thành công!',
                placement: 'topRight'
            });
        } catch (error) {
            console.error("Lỗi khi thêm thiết bị:", error);
            notification.error({
                message: 'Lỗi',
                description: 'Có lỗi khi thêm thiết bị. Vui lòng thử lại.',
                placement: 'topRight'
            });
        }
    };

    if (!userId) {
        return <RequireLogin />;
    }

    return (

        <div className="flex flex-col min-h-screen bg-gradient-to-t from-white to-blue-300">
            <Navbar onLogout={logout} />
            <div className="flex items-center justify-center flex-1">
                <div className="glassmorphism p-6 shadow-md rounded-lg flex flex-col justify-center items-center w-full max-w-md"> {/* Card container */}
                    <h2 className="text-2xl font-semibold mb-6 text-white text-center">Quản lý thiết bị</h2>

                    {devices.length > 0 ? (
                        <List
                            className="space-y-4 w-full"
                            bordered
                            dataSource={devices}
                            renderItem={device => (
                                <List.Item>
                                    <div className="flex justify-between items-center w-full">
                                        <div className="flex flex-col">
                                            <span className="text-lg font-medium text-gray-700">{device.name}</span>
                                            <span className="text-sm text-gray-500">ID: {device.id}</span>
                                        </div>
                                        <Button
                                            onClick={() => showRemoveConfirm(device.id)}
                                            danger
                                            size="small"
                                        >
                                            Hủy liên kết
                                        </Button>
                                    </div>
                                </List.Item>
                            )}
                        />
                    ) : (
                        <p className="text-center text-gray-600">Không tìm thấy thiết bị nào.</p>
                    )}

                    <Form onFinish={handleAddDevice} className="mt-6 w-full">
                        <Form.Item
                            name="deviceId"
                            rules={[{ required: true, message: 'Vui lòng nhập ID thiết bị' }]}
                        >
                            <Input
                                value={newDeviceId}
                                onChange={(e) => setNewDeviceId(e.target.value)}
                                placeholder="Nhập ID thiết bị"
                            />
                        </Form.Item>
                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                className="w-full"
                            >
                                Thêm thiết bị
                            </Button>
                        </Form.Item>
                    </Form>

                    <div className="mt-6 text-center w-full">
                        <Button
                            onClick={() => navigate('/home')}
                            className="w-full"
                        >
                            Quay về trang chính
                        </Button>
                    </div>
                </div>
            </div>


            <Modal
                title="Xác nhận hủy liên kết"
                visible={isModalVisible}
                onOk={handleRemoveDevice}
                onCancel={() => setIsModalVisible(false)}
                okText="Xác nhận"
                cancelText="Hủy"
            >
                <p>Bạn có chắc chắn muốn hủy liên kết với thiết bị này?</p>
            </Modal>
        </div>

    );
};

export default ManageDevices;

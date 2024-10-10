import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get, remove, update } from 'firebase/database';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { Input, Button, List, message, Form, Modal } from 'antd';
import Navbar from './Navbar';
import './style.css'; // Đảm bảo import file CSS

const ManageDevices = () => {
    const [devices, setDevices] = useState([]);
    const [newDeviceId, setNewDeviceId] = useState('');
    const [error, setError] = useState('');
    const [deviceToRemove, setDeviceToRemove] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const { userId, logout } = useUser();
    const navigate = useNavigate();

    useEffect(() => {
        const db = getDatabase();
        const userRef = ref(db, 'users/' + userId + '/devices');

        get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                const userDevices = Object.keys(snapshot.val());
                setDevices(userDevices);
            } else {
                setDevices([]);
            }
        });
    }, [userId]);

    const handleRemoveDevice = async () => {
        const db = getDatabase();
        try {
            await remove(ref(db, `users/${userId}/devices/${deviceToRemove}`));
            setDevices(devices.filter(device => device !== deviceToRemove));
            message.success('Hủy liên kết với thiết bị thành công');
            setIsModalVisible(false);
        } catch (error) {
            console.error("Lỗi khi xóa thiết bị:", error);
            message.error('Có lỗi khi xóa thiết bị. Vui lòng thử lại.');
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
                setError("Không có thiết bị nào có sẵn để đăng ký.");
                return;
            }

            const availableDevices = devicesSnapshot.val();

            if (!availableDevices[deviceId]) {
                setError("Không tìm thấy ID thiết bị trong danh sách thiết bị có sẵn.");
                return;
            }

            const userDevicesRef = ref(db, `users/${userId}/devices`);
            const userDevicesSnapshot = await get(userDevicesRef);
            const userDevices = userDevicesSnapshot.exists() ? userDevicesSnapshot.val() : {};

            if (userDevices[deviceId]) {
                setError("ID thiết bị đã tồn tại trong danh sách thiết bị của bạn.");
                return;
            }

            await update(userDevicesRef, {
                [deviceId]: true
            });
            setDevices([...devices, deviceId]);
            setNewDeviceId('');
            setError('');
            message.success('Thêm thiết bị thành công!');
        } catch (error) {
            console.error("Lỗi khi thêm thiết bị:", error);
            message.error("Có lỗi khi thêm thiết bị. Vui lòng thử lại.");
        }
    };

    if (!userId) {
        return (
            <div className="flex flex-col min-h-screen bg-gray-100">
                <div className="flex flex-col items-center justify-center flex-1">
                    <p className="text-red-500"><strong>Bạn cần đăng nhập để sử dụng các chức năng này.</strong></p>
                    <Button
                        className="mt-4"
                        type="primary"
                        onClick={() => navigate('/login')}
                    >
                        Đăng Nhập
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-r from-white to-blue-200">
            <Navbar onLogout={logout} />
            <div className="flex items-center justify-center flex-1">
                <div className="glassmorphism p-6 shadow-md rounded-lg flex flex-col justify-center items-center w-full max-w-md"> {/* Card container */}
                    <h2 className="text-2xl font-semibold mb-6 text-gray-800 text-center">Quản lý thiết bị</h2>
                    {error && <p className="text-red-500">{error}</p>}

                    {devices.length > 0 ? (
                        <List
                            className="space-y-4 w-full"
                            bordered
                            dataSource={devices}
                            renderItem={device => (
                                <List.Item>
                                    <div className="flex justify-between items-center w-full">
                                        <span className="text-lg font-medium text-gray-700">{device}</span>
                                        <Button
                                            onClick={() => showRemoveConfirm(device)}
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
                className="glassmorphism-modal" // Add glassmorphism class to modal
            >
                <p>Bạn có chắc chắn muốn hủy liên kết với thiết bị này?</p>
            </Modal>
        </div>
    );
};

export default ManageDevices;

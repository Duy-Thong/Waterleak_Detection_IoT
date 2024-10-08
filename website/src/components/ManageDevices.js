import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get, remove, update } from 'firebase/database';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { Input, Button, List, message, Form } from 'antd'; // Import Ant Design components

const ManageDevices = () => {
    const [devices, setDevices] = useState([]);
    const [newDeviceId, setNewDeviceId] = useState(''); // State for new device ID
    const [error, setError] = useState(''); // State for error message
    const { userId } = useUser();
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

    const handleRemoveDevice = async (deviceId) => {
        const db = getDatabase();
        try {
            await remove(ref(db, `users/${userId}/devices/${deviceId}`));
            setDevices(devices.filter(device => device !== deviceId));
            message.success('Xóa thiết bị thành công!'); // Show success message
        } catch (error) {
            console.error("Lỗi khi xóa thiết bị:", error);
            message.error('Có lỗi khi xóa thiết bị. Vui lòng thử lại.'); // Show error message
        }
    };

    const handleAddDevice = async (values) => {
        const { deviceId } = values;
        const db = getDatabase();

        try {
            // Fetch the list of available devices from the global "devices" path
            const devicesRef = ref(db, 'devices');
            const devicesSnapshot = await get(devicesRef);

            if (!devicesSnapshot.exists()) {
                setError("Không có thiết bị nào có sẵn để đăng ký."); // Handle case where no devices exist
                return;
            }

            const availableDevices = devicesSnapshot.val();

            // Check if the newDeviceId exists in the available devices
            if (!availableDevices[deviceId]) {
                setError("Không tìm thấy ID thiết bị trong danh sách thiết bị có sẵn."); // Set error message
                return;
            }

            // Check if the user already has the device
            const userDevicesRef = ref(db, `users/${userId}/devices`);
            const userDevicesSnapshot = await get(userDevicesRef);
            const userDevices = userDevicesSnapshot.exists() ? userDevicesSnapshot.val() : {};

            if (userDevices[deviceId]) {
                setError("ID thiết bị đã tồn tại trong danh sách thiết bị của bạn."); // Set error message
                return; // Exit function
            }

            // Add new device ID to user's devices
            await update(userDevicesRef, {
                [deviceId]: true
            });
            setDevices([...devices, deviceId]); // Update local devices state
            setNewDeviceId(''); // Clear the input
            setError(''); // Clear error message
            message.success('Thêm thiết bị thành công!'); // Show success message
        } catch (error) {
            console.error("Lỗi khi thêm thiết bị:", error);
            message.error("Có lỗi khi thêm thiết bị. Vui lòng thử lại."); // Set generic error message
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100"> {/* Centering styles */}
            <div className="p-6 bg-white shadow-md rounded-lg flex flex-col justify-center items-center w-full max-w-md"> {/* Card container */}
                <h2 className="text-2xl font-semibold mb-6 text-gray-800 text-center">Quản lý thiết bị</h2>
                {error && <p className="text-red-500">{error}</p>} {/* Display error message */}

                {devices.length > 0 ? (
                    <List
                        className="space-y-4 w-full" // Adjusted for responsiveness
                        bordered
                        dataSource={devices}
                        renderItem={device => (
                            <List.Item>
                                <div className="flex justify-between items-center w-full">
                                    <span className="text-lg font-medium text-gray-700">{device}</span>
                                    <Button
                                        onClick={() => handleRemoveDevice(device)}
                                        danger
                                    >
                                        Xóa
                                    </Button>
                                </div>
                            </List.Item>
                        )}
                    />
                ) : (
                    <p className="text-center text-gray-600">Không tìm thấy thiết bị nào.</p>
                )}

                {/* Add Device Form */}
                <Form onFinish={handleAddDevice} className="mt-6 w-full"> {/* Form width adjusted */}
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

                <div className="mt-6 text-center w-full"> {/* Adjusted for responsiveness */}
                    <Button
                        onClick={() => navigate('/home')} // Navigate back to home
                        className="w-full"
                    >
                        Quay về trang chính
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ManageDevices;

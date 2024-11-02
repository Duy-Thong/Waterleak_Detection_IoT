import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get } from "firebase/database";
import { useUser } from '../../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { Typography } from 'antd';
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

    useEffect(() => {
        if (userId) {
            const db = getDatabase();
            const userRef = ref(db, 'users/' + userId);
            get(userRef)
                .then((snapshot) => {
                    if (snapshot.exists()) {
                        const userData = snapshot.val();
                        const userDevices = Object.keys(userData.devices || {});
                        setDevices(userDevices);
                        setUsername(userData.username);

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
                    console.error("Error fetching user data:", error);
                });
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

    if (!userId) {
        return <RequireLogin />;
    }

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-t from-white to-blue-300">
            <Navbar onLogout={handleLogout}/>
            <div className="flex flex-col items-center justify-center flex-1 p-4 md:p-8 mt-5">
                <AntTitle level={2} className='mt-16 !text-white'>
                    <strong>Xin chào, {username || 'User'}!</strong>
                </AntTitle>
                
                <div className="flex flex-wrap justify-center gap-4 mt-8">
                    {devices.map(deviceId => (
                        <DeviceCard
                            key={deviceId}
                            deviceId={deviceId}
                            deviceName={deviceNames[deviceId]}
                            onClick={() => handleDeviceClick(deviceId)}
                        />
                    ))}
                    <DeviceCard
                        isAddCard
                        onClick={handleAddDevice}
                    />
                </div>
            </div>
        </div>
    );
};

export default Home;

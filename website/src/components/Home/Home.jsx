import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get, onValue } from "firebase/database"; 
import { useUser } from '../../contexts/UserContext';
import axios from 'axios'; 
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Title } from 'chart.js';
import { useNavigate } from 'react-router-dom';

// Import components
import Navbar from '../Navbar';
import DeviceSelector from '../DeviceSelector';
import CurrentDeviceData from '../CurrentDeviceData';
import Chart from '../Chart';
import RelayControl from '../RelayControl';

// Register ChartJS components
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Title);

const Home = () => {
    const [deviceData, setDeviceData] = useState(null);
    const [latestData, setLatestData] = useState(null);
    const [relayState, setRelayState] = useState('OFF');
    const [devices, setDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
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
                        const username = userData.username;
                        setDevices(userDevices);
                        setUsername(username);
                        if (userDevices.length > 0) {
                            setSelectedDeviceId(userDevices[0]);
                            fetchDeviceData(userDevices[0]);
                        }
                    }
                })
                .catch((error) => {
                    console.error("Error fetching user data:", error);
                });
        }
    }, [userId]);

    // Function to fetch device data
    const fetchDeviceData = async (deviceId) => {
        try {
            const response = await axios.get(
                `https://esp8266firebase-2f31a-default-rtdb.asia-southeast1.firebasedatabase.app/devices/${deviceId}.json`
            );
            const data = response.data;

            if (data) {
                setDeviceData(data);
                const sortedKeys = Object.keys(data.flow_sensor).sort();
                const latestKey = sortedKeys[sortedKeys.length - 1];
                setLatestData(data.flow_sensor[latestKey]);
                setRelayState(data.relay.control || 'OFF'); 
            } else {
                alert('Không tìm thấy thiết bị.');
                setDeviceData(null);
                setLatestData(null);
            }
        } catch (error) {
            console.error("Error fetching device data:", error);
            alert('Đã xảy ra lỗi khi lấy dữ liệu thiết bị.');
        }
    };

    useEffect(() => {
        if (selectedDeviceId) {
            const db = getDatabase();
            const relayRef = ref(db, `devices/${selectedDeviceId}/relay`);

            const unsubscribe = onValue(relayRef, (snapshot) => {
                const relayData = snapshot.val();
                if (relayData) {
                    setRelayState(relayData.control || 'OFF');
                }
            });

            return () => unsubscribe(); 
        }
    }, [selectedDeviceId]);

    const handleDeviceChange = (e) => {
        const newDeviceId = e.target.value;
        setSelectedDeviceId(newDeviceId);
        fetchDeviceData(newDeviceId);
    };

    const toggleRelay = async () => {
        const newRelayState = relayState === 'OFF' ? 'ON' : 'OFF';
        try {
            await axios.patch(
                `https://esp8266firebase-2f31a-default-rtdb.asia-southeast1.firebasedatabase.app/devices/${selectedDeviceId}/relay.json`,
                { control: newRelayState }
            );
            setRelayState(newRelayState);
        } catch (error) {
            console.error("Error toggling relay:", error);
        }
    };

    const chartData = deviceData ? {
        labels: Object.keys(deviceData.flow_sensor).map(key => deviceData.flow_sensor[key].timestamp),
        datasets: [
            {
                label: 'Cảm biến 1',
                data: Object.keys(deviceData.flow_sensor).map(key => deviceData.flow_sensor[key].sensor1),
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
            },
            {
                label: 'Cảm biến 2',
                data: Object.keys(deviceData.flow_sensor).map(key => deviceData.flow_sensor[key].sensor2),
                borderColor: 'rgba(153, 102, 255, 1)',
                backgroundColor: 'rgba(153, 102, 255, 0.2)',
                fill: true,
            }
        ]
    } : null;

    const chartOptions = {
        plugins: {
            legend: {
                display: true,
                position: 'top',
            },
            tooltip: {
                callbacks: {
                    label: function(tooltipItem) {
                        const label = tooltipItem.dataset.label || '';
                        const value = tooltipItem.raw;
                        return `${label}: ${value}`;
                    }
                }
            },
            title: {
                display: true,
                text: 'Dữ liệu cảm biến theo thời gian',
            },
        },
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleManageDevice = () => {
        navigate('/manage-devices');
    };

    useEffect(() => {
        const intervalId = setInterval(() => {
            if (selectedDeviceId) {
                fetchDeviceData(selectedDeviceId);
            }
        }, 5000);

        return () => clearInterval(intervalId);
    }, [selectedDeviceId]);

    if (!userId) {
        return (
            <div className="flex flex-col min-h-screen bg-gray-100">
                <Navbar onLogout={handleLogout} />

                <div className="flex flex-col items-center justify-center flex-1">
                    <p className="text-red-500"><strong>Bạn cần đăng nhập để sử dụng các chức năng này.</strong></p>
                    <button 
                        className="px-4 py-2 mt-4 bg-gray-500 text-white rounded-md shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400" 
                        onClick={() => navigate('/login')}
                    >
                        Đăng Nhập
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
            <Navbar onLogout={handleLogout} />

            <div className="flex flex-col items-center justify-center flex-1 p-4 md:p-8">
                <h1 className='mb-3 text-xl md:text-2xl'><strong>Xin chào, {username || 'User'}!</strong></h1>
                
                {devices.length > 0 && (
                    <RelayControl 
                        relayState={relayState} 
                        onToggleRelay={toggleRelay} 
                    />
                )}
                <div className="flex flex-col md:flex-row justify-center items-center mt-4 mb-4 gap-4 ">
                    <h2 className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400">Chọn thiết bị:</h2>
                    <DeviceSelector 
                        devices={devices} 
                        selectedDeviceId={selectedDeviceId} 
                        onDeviceChange={handleDeviceChange} 
                    />
                    <button 
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        onClick={handleManageDevice}
                    >
                        Quản lý thiết bị
                    </button>
                </div>
                <CurrentDeviceData latestData={latestData} />
                <Chart chartData={chartData} chartOptions={chartOptions} className="mt-4" />

                
            </div>
        </div>
    );
};

export default Home;

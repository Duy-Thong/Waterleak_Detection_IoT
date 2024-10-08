import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get, update } from "firebase/database";
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
import DeviceForm from '../DeviceForm';

// Register ChartJS components
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Title);

const Home = () => {
    const [showForm, setShowForm] = useState(false);
    const [deviceId, setDeviceId] = useState('');
    const [deviceData, setDeviceData] = useState(null);
    const [latestData, setLatestData] = useState(null);
    const [relayState, setRelayState] = useState('OFF');
    const [devices, setDevices] = useState([]); // Store devices for dropdown
    const [selectedDeviceId, setSelectedDeviceId] = useState(''); // Store selected device ID
    const [username, setUsername] = useState(''); // State for storing the username
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
                        const username = userData.username; // Fetch the username
                        setDevices(userDevices);
                        setUsername(username); // Store the username
                        if (userDevices.length > 0) {
                            setSelectedDeviceId(userDevices[0]); // Set first device as selected
                            fetchDeviceData(userDevices[0]); // Fetch data for the first device
                        }
                    }
                })
                .catch((error) => {
                    console.error("Error fetching user data:", error);
                });
        }
    }, [userId]);

    const fetchDeviceData = async (deviceId) => {
        try {
            const response = await axios.get(
                `https://esp8266firebase-2f31a-default-rtdb.asia-southeast1.firebasedatabase.app/${deviceId}.json`
            );
            const data = response.data;
            setDeviceData(data);

            const sortedKeys = Object.keys(data.flow_sensor).sort();
            const latestKey = sortedKeys[sortedKeys.length - 1];
            setLatestData(data.flow_sensor[latestKey]);
        } catch (error) {
            console.error("Error fetching device data:", error);
        }
    };

    const handleDeviceChange = (e) => {
        const newDeviceId = e.target.value;
        setSelectedDeviceId(newDeviceId);
        fetchDeviceData(newDeviceId); // Fetch data for the selected device
    };

    const toggleRelay = async () => {
        const newRelayState = relayState === 'OFF' ? 'ON' : 'OFF';
        try {
            await axios.patch(
                `https://esp8266firebase-2f31a-default-rtdb.asia-southeast1.firebasedatabase.app/${selectedDeviceId}/relay.json`,
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
                label: 'Sensor 1',
                data: Object.keys(deviceData.flow_sensor).map(key => deviceData.flow_sensor[key].sensor1),
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
            },
            {
                label: 'Sensor 2',
                data: Object.keys(deviceData.flow_sensor).map(key => deviceData.flow_sensor[key].sensor2),
                borderColor: 'rgba(153, 102, 255, 1)',
                backgroundColor: 'rgba(153, 102, 255, 0.2)',
                fill: true,
            }
        ]
    } : null;

    const handleAddDeviceClick = () => {
        setShowForm(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const db = getDatabase();

        update(ref(db, 'users/' + userId + '/devices'), {
            [deviceId]: true
        })
        .then(() => {
            console.log("Device ID added");
            setShowForm(false);
            setDeviceId(''); // Reset device ID
            fetchDeviceData(deviceId); // Fetch the new device info
        })
        .catch((error) => {
            console.error("Error adding device:", error);
        });
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
            <Navbar onLogout={handleLogout} />

            <div className="flex flex-col items-center justify-center flex-1">
                <p><strong>Welcome, {username || 'User'}!</strong></p>

                <CurrentDeviceData latestData={latestData} />
                
                <DeviceSelector 
                    devices={devices} 
                    selectedDeviceId={selectedDeviceId} 
                    onDeviceChange={handleDeviceChange} 
                />

                <Chart chartData={chartData} />

                {devices.length > 0 && (
                    <RelayControl 
                        relayState={relayState} 
                        onToggleRelay={toggleRelay} 
                    />
                )}

                {showForm ? (
                    <DeviceForm 
                        deviceId={deviceId} 
                        onChange={(e) => setDeviceId(e.target.value)} 
                        onSubmit={handleSubmit} 
                        onCancel={() => setShowForm(false)} 
                    />
                ) : (
                    <button 
                        className="px-4 py-2 mt-4 bg-gray-500 text-white rounded-md shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400" 
                        onClick={handleAddDeviceClick}
                    >
                        Add Device
                    </button>
                )}
            </div>
        </div>
    );
};

export default Home;

// src/components/ManageDevices.js
import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get, remove, update } from 'firebase/database';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';

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
        } catch (error) {
            console.error("Error removing device:", error);
        }
    };

    const handleAddDevice = async (e) => {
        e.preventDefault(); // Prevent form submission
        const db = getDatabase();
        const userRef = ref(db, `users/${userId}/devices`);

        try {
            // Check if the device already exists
            const snapshot = await get(userRef);
            const existingDevices = snapshot.exists() ? snapshot.val() : {};

            if (existingDevices[newDeviceId]) {
                setError("Device ID already exists."); // Set error message
                return; // Exit function
            }

            // Add new device ID to user's devices
            await update(ref(db, `users/${userId}/devices`), {
                [newDeviceId]: true
            });
            setDevices([...devices, newDeviceId]); // Update local devices state
            setNewDeviceId(''); // Clear the input
            setError(''); // Clear error message
        } catch (error) {
            console.error("Error adding device:", error);
            setError("Error adding device. Please try again."); // Set generic error message
        }
    };

    return (
        <div className="p-6 bg-white shadow-md rounded-lg flex flex-col justify-center items-center">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800 text-center">Manage Devices</h2>
            {error && <p className="text-red-500">{error}</p>} {/* Display error message */}

            {devices.length > 0 ? (
                <ul className="space-y-4 w-2/3">
                    {devices.map((device) => (
                        <li key={device} className="flex justify-between items-center p-4 bg-gray-100 border border-gray-300 rounded-md">
                            <span className="text-lg font-medium text-gray-700">{device}</span>
                            <button
                                onClick={() => handleRemoveDevice(device)}
                                className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 ease-in-out"
                            >
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-center text-gray-600">No devices found.</p>
            )}

            {/* Add Device Form */}
            <form onSubmit={handleAddDevice} className="mt-6">
                <input
                    type="text"
                    value={newDeviceId}
                    onChange={(e) => setNewDeviceId(e.target.value)}
                    placeholder="Enter Device ID"
                    className="px-4 py-2 border border-gray-300 rounded-md mr-2"
                    required
                />
                <button
                    type="submit"
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition duration-300 ease-in-out"
                >
                    Add Device
                </button>
            </form>

            <div className="mt-6 text-center">
                <button
                    onClick={() => navigate('/home')} // Navigate back to home
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300 ease-in-out"
                >
                    Back to Home
                </button>
            </div>
        </div>
    );
};

export default ManageDevices;

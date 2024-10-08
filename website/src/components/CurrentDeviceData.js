import React from 'react';

const CurrentDeviceData = ({ latestData }) => (
    latestData && (
        <div className="p-4 bg-green-200 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-2">Current Device Data</h2>
            <p><strong>Timestamp:</strong> {latestData.timestamp}</p>
            <p><strong>Sensor 1:</strong> {latestData.sensor1} L/min</p>
            <p><strong>Sensor 2:</strong> {latestData.sensor2} L/min</p>
        </div>
    )
);

export default CurrentDeviceData;

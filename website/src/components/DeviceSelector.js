import React from 'react';

const DeviceSelector = ({ devices, selectedDeviceId, onDeviceChange }) => (
    devices.length > 0 && (
        <select
            value={selectedDeviceId}
            onChange={onDeviceChange}
            className="px-1 py-1 border rounded-md shadow-md text-black"
        >
            {devices.map(device => (
                <option key={device} value={device}>
                    {device}
                </option>
            ))}
        </select>
    )
);

export default DeviceSelector;

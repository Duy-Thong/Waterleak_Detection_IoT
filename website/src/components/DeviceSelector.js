import React from 'react';

const DeviceSelector = ({ devices, selectedDeviceId, onDeviceChange }) => (
    devices.length > 0 && (
        <select
            value={selectedDeviceId}
            onChange={onDeviceChange}
            className="px-4 py-2 mt-4 border rounded-md shadow-md text-black"
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

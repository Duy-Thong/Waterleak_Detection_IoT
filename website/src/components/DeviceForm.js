import React from 'react';

const DeviceForm = ({ deviceId, onChange, onSubmit, onCancel }) => (
    <form className="mt-4" onSubmit={onSubmit}>
        <input
            type="text"
            value={deviceId}
            onChange={onChange}
            placeholder="Enter Device ID"
            required
            className="px-4 py-2 border rounded-md shadow-md"
        />
        <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded-md shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400">
            Add Device
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-500 text-white rounded-md shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 ml-2">
            Cancel
        </button>
    </form>
);

export default DeviceForm;

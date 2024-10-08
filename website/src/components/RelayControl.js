import React from 'react';

const RelayControl = ({ relayState, onToggleRelay }) => (
    <div className="flex items-center space-x-4 mt-4 mb-5">
        <label className="relative inline-flex items-center cursor-pointer">
            <input
                type="checkbox"
                className="sr-only peer"
                checked={relayState === 'ON'}
                onChange={onToggleRelay}
            />
            <div className="w-14 h-8 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-400 transition-all duration-300">
                <div className={`w-7 h-7 bg-white rounded-full shadow-md transform transition-all duration-300 ${relayState === 'ON' ? 'translate-x-6' : 'translate-x-1'}`}></div>
            </div>
        </label>
        <span className="text-xl font-semibold text-gray-700">
            Relay is {relayState === 'OFF' ? 'OFF' : 'ON'}
        </span>
    </div>
);

export default RelayControl;

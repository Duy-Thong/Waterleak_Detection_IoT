import React from 'react';

const RelayControl = ({ relayState, onToggleRelay }) => (
    <button
        className="px-4 py-2 bg-blue-500 text-white rounded-md shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 mt-4"
        onClick={onToggleRelay}
    >
        Turn {relayState === 'OFF' ? 'ON' : 'OFF'} Relay
    </button>
);

export default RelayControl;

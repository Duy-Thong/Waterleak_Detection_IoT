import React from 'react';
import { Switch } from 'antd';

const RelayControl = ({ relayState, onToggleRelay }) => (
    <div className="flex items-center space-x-4 mt-4 mb-4 ">
        <Switch
            checked={relayState === 'ON'}
            onChange={onToggleRelay}
            checkedChildren="BẬT"
            unCheckedChildren="TẮT"
            className='w-16 '
        />
        <span className="text-xl font-semibold text-gray-700">
            Rơ-le đang {relayState === 'OFF' ? 'TẮT' : 'BẬT'}
        </span>
    </div>
);

export default RelayControl;

import React, { useState, useEffect } from 'react';
import { Card, Switch } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../firebase';  // Changed from 'db' to 'database'

const DeviceCard = ({ deviceId, deviceName, isAddCard, onClick }) => {
  const [relayState, setRelayState] = useState(false);

  useEffect(() => {
    if (!isAddCard && deviceId) {
      const relayRef = ref(database, `devices/${deviceId}/relay/control`);
      const unsubscribe = onValue(relayRef, (snapshot) => {
        setRelayState(snapshot.val() === 'ON');
      });
      
      return () => unsubscribe();
    }
  }, [deviceId, isAddCard]);

  const handleToggleRelay = async (checked) => {
    try {
      const relayRef = ref(database, `devices/${deviceId}/relay/control`);
      await set(relayRef, checked ? 'ON' : 'OFF');
    } catch (error) {
      console.error('Error updating relay state:', error);
    }
  };

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '2px solid rgba(255, 255, 255, 0.5)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
    borderRadius: '10px',
    transition: 'all 0.3s ease-in-out',
    backgroundImage: isAddCard ? 
      'url(/images/add-device-bg.jpg)' : 
      'url(/images/device-bg.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundBlendMode: 'overlay'
  };

  const commonClasses = "w-48 h-48 m-2 transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:bg-opacity-90";

  if (isAddCard) {
    return (
      <Card
        hoverable
        className={`${commonClasses} bg-gradient-to-br from-emerald-200/50 to-green-400/50 hover:from-emerald-200/70 hover:to-green-400/70`}
        style={glassStyle}
        bodyStyle={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px'
        }}
        onClick={onClick}
      >
        <PlusOutlined className="text-3xl text-blue-500" />
        <p className="mt-3 text-blue-500 font-medium">Thêm thiết bị</p>
      </Card>
    );
  }

  return (
    <Card
      hoverable
      className={`${commonClasses} bg-gradient-to-br from-emerald-300/50 to-green-600/50 hover:from-emerald-300/70 hover:to-green-600/70`}
      style={glassStyle}
      bodyStyle={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        // Prevent card click when toggling switch
        if (e.target.closest('.ant-switch')) {
          e.stopPropagation();
          return;
        }
        onClick();
      }}
    >
      <div className="text-center">
        <h4 className="font-bold text-blue-500">Thiết bị</h4>
        <h3 className="text-xl font-bold text-blue-500">
          {deviceName || 'Thiết bị'}
        </h3>
        <div className="mt-3">
          <Switch
            checked={relayState}
            onChange={handleToggleRelay}
            className="bg-gray-300"
            checkedChildren="ON"
            unCheckedChildren="OFF"
          />
        </div>
      </div>
    </Card>
  );
};

export default DeviceCard;


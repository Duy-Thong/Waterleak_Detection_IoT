import React, { useState, useEffect } from 'react';
import { Card, Switch, Badge } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined, AppstoreOutlined } from '@ant-design/icons';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../firebase';

const DeviceCard = ({ deviceId, deviceName, isAddCard, onClick }) => {
  const [relayState, setRelayState] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  const isDeviceActive = (deviceData) => {
    if (!deviceData || !deviceData.flow_sensor) return false;
    
    const flowSensorData = deviceData.flow_sensor;
    const sortedKeys = Object.keys(flowSensorData).sort();
    
    if (sortedKeys.length === 0) return false;
    
    const latestKey = sortedKeys[sortedKeys.length - 1];
    const latestTimestamp = flowSensorData[latestKey].timestamp;
    
    const now = Date.now();
    const lastActivity = new Date(latestTimestamp).getTime();
    return (now - lastActivity) < 10000; // 10 seconds threshold
  };

  const checkDeviceStatus = () => {
    if (!isAddCard && deviceId) {
      const deviceRef = ref(database, `devices/${deviceId}`);
      onValue(deviceRef, (snapshot) => {
        const deviceData = snapshot.val();
        setIsOnline(isDeviceActive(deviceData));
      }, { onlyOnce: true });
    }
  };

  useEffect(() => {
    if (!isAddCard && deviceId) {
      // Initial check
      checkDeviceStatus();

      // Set up periodic checks
      const intervalId = setInterval(checkDeviceStatus, 5000); // Check every 5 seconds

      // Relay state listener
      const relayRef = ref(database, `devices/${deviceId}/relay/control`);
      const unsubscribeRelay = onValue(relayRef, (snapshot) => {
        setRelayState(snapshot.val() === 'ON');
      });

      // Device data listener for online status
      const deviceRef = ref(database, `devices/${deviceId}`);
      const unsubscribeDevice = onValue(deviceRef, (snapshot) => {
        const deviceData = snapshot.val();
        setIsOnline(isDeviceActive(deviceData));
      });
      
      return () => {
        clearInterval(intervalId);
        unsubscribeRelay();
        unsubscribeDevice();
      };
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
    border: '2px solid rgba(255, 255, 255, 0.6)',
    boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.15)',
    borderRadius: '12px',
    transition: 'all 0.3s ease-in-out',
  };

  const commonClasses = "w-full sm:w-48 md:w-52 lg:w-56 h-52 m-2 transform transition-all duration-300 hover:scale-105 hover:shadow-lg";

  if (isAddCard) {
    return (
      <Card
        hoverable
        className={`${commonClasses} hover:bg-white/30`}
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
        <div className="p-3 rounded-full bg-white/30 mb-3">
          <PlusOutlined className="text-3xl text-blue-500" />
        </div>
        <p className="text-base text-blue-600 font-medium">Thêm thiết bị</p>
      </Card>
    );
  }

  return (
    <Card
      hoverable
      className={`${commonClasses} hover:bg-white/30`}
      style={glassStyle}
      bodyStyle={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
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
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AppstoreOutlined className="text-base text-blue-500" />
            <span className="font-semibold text-blue-600 text-sm">Thiết bị</span>
          </div>
          <Badge 
            className="ml-auto"
            status={isOnline ? "success" : "error"} 
            text={
              <span className={`text-xs ${isOnline ? "text-green-600" : "text-red-600"}`}>
                {isOnline ? "Online" : "Offline"}
              </span>
            }
          />
        </div>

        {/* Main Content */}
        <div className="flex flex-col items-center mt-6">
          <h3 className="text-xl font-bold text-blue-600 h-14 flex items-center px-2 text-center overflow-hidden">
            {deviceName || 'Thiết bị'}
          </h3>
          
          <div className="mt-auto mb-5">
            <Switch
              checked={relayState}
              onChange={handleToggleRelay}
              className={`${relayState ? 'bg-green-500' : 'bg-gray-300'} mt-5 ${!isOnline && 'opacity-50 cursor-not-allowed'}`}
              size="large"
              checkedChildren={<CheckOutlined />}
              unCheckedChildren={<CloseOutlined />}
              disabled={!isOnline}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DeviceCard;


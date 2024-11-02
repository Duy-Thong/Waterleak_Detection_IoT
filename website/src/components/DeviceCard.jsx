import React from 'react';
import { Card } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const DeviceCard = ({ deviceId, deviceName, isAddCard, onClick }) => {
  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
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
      onClick={onClick}
    >
      <div className="text-center">
        <h4 className=" font-bold text-blue-500">Thiết bị</h4>
        <h3 className="text-xl font-bold text-blue-500">
          {deviceName || 'Thiết bị'}
        </h3>
      </div>
    </Card>
  );
};

export default DeviceCard;

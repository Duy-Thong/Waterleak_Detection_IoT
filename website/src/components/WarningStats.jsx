import React, { useState, useEffect, useRef } from 'react';
import { Card, Statistic, Button } from 'antd';
import { getDatabase, ref, get } from "firebase/database";
import { AlertOutlined, CheckCircleOutlined, ExclamationCircleOutlined, PercentageOutlined, WarningOutlined } from '@ant-design/icons';

const WarningStats = ({ deviceId, navigate }) => {
    const [warningStats, setWarningStats] = useState({
        total: 0,
        resolved: 0,
        unresolved: 0,
        resolutionRate: 0
    });
    const intervalRef = useRef(null);

    useEffect(() => {
        const fetchWarnings = async () => {
            try {
                const db = getDatabase();
                const warningRef = ref(db, `devices/${deviceId}/warning`);
                const snapshot = await get(warningRef);
                
                if (snapshot.exists()) {
                    const warningsData = snapshot.val();
                    const warningsArray = Object.values(warningsData);
                    
                    const total = warningsArray.length;
                    const resolved = warningsArray.filter(w => w.resolved).length;
                    
                    setWarningStats({
                        total,
                        resolved,
                        unresolved: total - resolved,
                        resolutionRate: total > 0 ? (resolved / total * 100).toFixed(1) : 0
                    });
                } else {
                    setWarningStats({
                        total: 0,
                        resolved: 0,
                        unresolved: 0,
                        resolutionRate: 0
                    });
                }
            } catch (error) {
                console.error("Error fetching warnings:", error);
            }
        };

        fetchWarnings();
        intervalRef.current = setInterval(fetchWarnings,500);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [deviceId]);

    return (
        <div className="w-3/4 glassmorphism p-2 md:p-6 mb-3">
            <div className="flex flex-col space-y-2 md:space-y-4 mt-3 mb-3">
                <div className='flex items-center justify-center'><h1>Cảnh báo</h1></div>
                <div className="grid grid-cols-4 gap-1 md:gap-4 mt-2 mb-2">
                    <Card bordered={false} className="text-center shadow-sm glassmorphism min-w-0 px-2 py-1" size="small">
                        <Statistic
                            title={<span className="hidden md:inline text-base">Tổng số cảnh báo</span>}
                            value={warningStats.total}
                            prefix={<AlertOutlined style={{ color: '#1890ff', marginRight: '8px' }} className="text-sm md:text-xl" />}
                            className="text-xs md:text-lg"
                            valueStyle={{ fontSize: '14px', '@media (min-width: 768px)': { fontSize: '24px' } }}
                        />
                    </Card>
                    <Card bordered={false} className="text-center shadow-sm glassmorphism min-w-0 px-2 py-1" size="small">
                        <Statistic
                            title={<span className="hidden md:inline text-base">Đã giải quyết</span>}
                            value={warningStats.resolved}
                            valueStyle={{ color: '#3f8600', fontSize: '14px', '@media (min-width: 768px)': { fontSize: '24px' } }}
                            prefix={<CheckCircleOutlined style={{ color: '#3f8600', marginRight: '8px' }} className="text-sm md:text-xl" />}
                            className="text-xs md:text-lg"
                        />
                    </Card>
                    <Card bordered={false} className="text-center shadow-sm glassmorphism min-w-0 px-2 py-1" size="small">
                        <Statistic
                            title={<span className="hidden md:inline text-base">Chưa giải quyết</span>}
                            value={warningStats.unresolved}
                            valueStyle={{ color: '#cf1322', fontSize: '14px', '@media (min-width: 768px)': { fontSize: '24px' } }}
                            prefix={<ExclamationCircleOutlined style={{ color: '#cf1322', marginRight: '8px' }} className="text-sm md:text-xl" />}
                            className="text-xs md:text-lg"
                        />
                    </Card>
                    <Card bordered={false} className="text-center shadow-sm glassmorphism min-w-0 px-2 py-1" size="small">
                        <Statistic
                            title={<span className="hidden md:inline text-base">Tỉ lệ giải quyết</span>}
                            value={warningStats.resolutionRate}
                            precision={1}
                            valueStyle={{ fontSize: '14px', '@media (min-width: 768px)': { fontSize: '24px' } }}
                            prefix={<PercentageOutlined style={{ color: '#1890ff', marginRight: '8px' }} className="text-sm md:text-xl" />}
                            className="text-xs md:text-lg"
                        />
                    </Card>
                </div>
                <div className="flex justify-center mt-4 md:mt-5">
                    <Button
                        type="ghost"
                        danger
                        onClick={() => navigate(`/device/${deviceId}/warnings`)}
                        size="middle"
                        style={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.5)',
                            borderColor: '#ff4d4f'
                        }}
                    >
                        <WarningOutlined />
                        <span className="hidden md:inline ml-2">Xem chi tiết cảnh báo</span>
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default WarningStats;

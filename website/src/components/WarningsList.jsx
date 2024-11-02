import React, { useState } from 'react';
import { Typography, Card, Statistic, Badge, message, Radio, Space, DatePicker, Button } from 'antd';
import '../styles/Checkbox.css';
import { WarningOutlined, DashboardOutlined, ClockCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { ref, update } from 'firebase/database';
import { database } from '../firebase';  // Change to import database instead of db
import locale from 'antd/es/date-picker/locale/vi_VN';

const { Title } = Typography;

const WarningsList = ({ warnings, onResolveWarning, deviceId }) => {  // Thêm deviceId prop
    const navigate = useNavigate();
    const [filterStatus, setFilterStatus] = useState('all'); // Add this state
    const [dateFilter, setDateFilter] = useState(null);

    // Add filter function
    const getFilteredWarnings = () => {
        let filtered = [...warnings];

        // Filter by status
        if (filterStatus === 'resolved') {
            filtered = filtered.filter(w => w.resolved);
        } else if (filterStatus === 'unresolved') {
            filtered = filtered.filter(w => !w.resolved);
        }

        // Filter by date if selected
        if (dateFilter) {
            filtered = filtered.filter(w => {
                const warningDate = dayjs(w.timestamp);
                return warningDate.isSame(dateFilter, 'day');
            });
        }

        return filtered;
    };

    const handleResolveChange = async (warning, checked) => {
        try {
            console.log('Updating warning:', warning.id, 'to:', checked);
            
            if (!warning.id || !deviceId) {
                console.error('Warning ID or Device ID is missing');
                return;
            }

            // Sửa đường dẫn để match với cấu trúc database
            const warningRef = ref(database, `devices/${deviceId}/warning/${warning.id}`);
            const updates = {
                resolved: checked
            };

            await update(warningRef, updates);
            console.log('Database updated successfully');

            // Cập nhật UI
            onResolveWarning(warning, checked);
        } catch (error) {
            console.error('Error updating warning:', error);
            message.error('Không thể cập nhật trạng thái cảnh báo');
        }
    };

    // Update formatFlow function to properly handle and format flow values
    const formatFlow = (value) => {
        const num = Number(value);
        if (isNaN(num) || value === null || value === undefined) {
            return "0.00";
        }
        return num.toFixed(2);
    };

    // Thêm hàm tính toán số lượng warnings
    const getWarningStats = () => {
        const resolved = warnings.filter(w => w.resolved).length;
        const unresolved = warnings.filter(w => !w.resolved).length;
        return { resolved, unresolved };
    };

    const stats = getWarningStats();

    const CustomCheckbox = ({ checked, onChange, id }) => (
        <div className="checkbox-wrapper-31">
            <input 
                type="checkbox" 
                checked={checked}
                onChange={(e) => onChange(e)}
                id={`cbx-${id}`}
            />
            <svg viewBox="0 0 35.6 35.6">
                <circle className="background" cx="17.8" cy="17.8" r="17.8"></circle>
                <circle className="stroke" cx="17.8" cy="17.8" r="14.37"></circle>
                <polyline className="check" points="11.78 18.12 15.55 22.23 25.17 12.87"></polyline>
            </svg>
        </div>
    );

    return (
        <div className="mt-5 mb-5 w-3/4 mx-auto">
            <div className="p-6 rounded-xl glassmorphism">
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="flex items-center gap-4">
                            <Button 
                                icon={<ArrowLeftOutlined />}
                                onClick={() => navigate(-1)}
                                className="flex items-center border border-blue-600 text-blue-600 bg-white/50 hover:bg-blue-50"
                            >
                                Trở về
                            </Button>
                            <Title level={4} className="!text-blue-900/90 !mb-0 flex items-center gap-2">
                                <WarningOutlined className="text-yellow-600" />
                                <span>Cảnh báo vỡ ống nước</span>
                            </Title>
                        </div>
                        <div className="flex flex-wrap gap-4 items-center">
                            <DatePicker 
                                locale={locale}
                                onChange={(date) => setDateFilter(date)}
                                placeholder="Chọn ngày"
                                className="border border-blue-600 text-blue-600 bg-white/50"
                                format="DD/MM/YYYY"
                                allowClear
                            />
                            <Radio.Group 
                                value={filterStatus} 
                                onChange={e => setFilterStatus(e.target.value)}
                                className="bg-white/50 p-1 rounded-lg"
                            >
                                <Space size={8}>
                                    <Radio.Button 
                                        value="all" 
                                        className="border border-blue-600 text-blue-600 hover:text-blue-700 hover:border-blue-700 bg-white/50"
                                    >
                                        Tất cả
                                    </Radio.Button>
                                    <Radio.Button 
                                        value="unresolved" 
                                        className="border border-red-600 text-red-600 hover:text-red-700 hover:border-red-700 bg-white/50"
                                    >
                                        Chưa xử lý
                                    </Radio.Button>
                                    <Radio.Button 
                                        value="resolved" 
                                        className="border border-green-600 text-green-600 hover:text-green-700 hover:border-green-700 bg-white/50"
                                    >
                                        Đã xử lý
                                    </Radio.Button>
                                </Space>
                            </Radio.Group>
                        </div>
                    </div>
                    
                    {/* Thêm phần thống kê */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 glassmorphism rounded-xl">
                        <Statistic
                            title={<span className="text-blue-800">Tổng số sự cố</span>}
                            value={warnings.length}
                            valueStyle={{ color: '#1e40af' }}
                        />
                        <Statistic
                            title={<span className="text-green-800">Đã xử lý</span>}
                            value={stats.resolved}
                            valueStyle={{ color: '#15803d' }}
                        />
                        <Statistic
                            title={<span className="text-red-800">Chưa xử lý</span>}
                            value={stats.unresolved}
                            valueStyle={{ color: '#dc2626' }}
                        />
                        <Statistic
                            title={<span className="text-blue-800">Tỷ lệ xử lý</span>}
                            value={warnings.length ? (stats.resolved / warnings.length * 100).toFixed(1) : 0}
                            suffix="%"
                            valueStyle={{ color: '#1e40af' }}
                        />
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-4">
                    {getFilteredWarnings().map((warning) => (
                        <div key={warning.id} className="w-full md:w-[calc(50%-0.5rem)] transform transition-all duration-300 hover:-translate-y-1">
                            <Badge.Ribbon 
                                text={warning.resolved ? "Đã xử lý" : "Chưa xử lý"}
                                color={warning.resolved ? "green" : "red"}
                                className="font-medium"
                            >
                                <Card 
                                    className={`w-full glassmorphism transition-all duration-300 
                                        ${warning.resolved 
                                            ? 'bg-green-50/70 hover:bg-green-50/90' 
                                            : 'bg-white/70 hover:bg-white/90'
                                        } 
                                        border-t-4 ${warning.resolved ? 'border-t-green-500' : 'border-t-red-500'}
                                        shadow-lg hover:shadow-xl rounded-xl`}
                                    bodyStyle={{ padding: '1.25rem' }}
                                >
                                    <div className="flex flex-col gap-4">
                                        {/* Header */}
                                        <div className="pb-3 border-b border-white/20">
                                            <div className="flex items-center gap-2 text-blue-900/80">
                                                <ClockCircleOutlined className="text-blue-600" />
                                                <span>{dayjs(warning.timestamp).format('DD/MM/YYYY HH:mm:ss')}</span>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-blue-900/90 font-medium p-2 rounded-lg glassmorphism-light">
                                                <DashboardOutlined className="text-blue-600" />
                                                <span>Lưu lượng cảm biến 1: <span className="text-blue-600 font-bold">{formatFlow(warning?.flowDifference1)} L/min</span></span>
                                            </div>
                                            <div className="flex items-center gap-2 text-blue-900/90 font-medium p-2 rounded-lg glassmorphism-light">
                                                <DashboardOutlined className="text-blue-600" />
                                                <span>Lưu lượng cảm biến 2: <span className="text-blue-600 font-bold">{formatFlow(warning?.flowDifference2)} L/min</span></span>
                                            </div>
                                            <div className="flex items-center gap-2 text-blue-900/90 font-medium p-2 rounded-lg glassmorphism-light">
                                                <DashboardOutlined className="text-blue-600" />
                                                <span>Chênh lệch: <span className="text-blue-600 font-bold">{formatFlow(warning?.flowDifference)} L/min</span></span>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="pt-3 border-t border-white/20 flex justify-end items-center gap-2">
                                            <span className="text-blue-900/90 whitespace-nowrap font-medium">
                                                Đã xử lý
                                            </span>
                                            <CustomCheckbox
                                                checked={warning.resolved || false}
                                                onChange={(e) => handleResolveChange(warning, e.target.checked)}
                                                id={warning.id} // Add ID prop here
                                            />
                                            
                                        </div>
                                    </div>
                                </Card>
                            </Badge.Ribbon>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WarningsList;
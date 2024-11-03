import React, { useState } from 'react';
import { Typography, Card, Badge, message, Radio, Space, DatePicker, Button } from 'antd';
import '../styles/Checkbox.css';
import { WarningOutlined, ArrowLeftOutlined, ExclamationCircleOutlined, AlertOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
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
    const [severityFilter, setSeverityFilter] = useState('all');

    // Add filter function
    const getFilteredWarnings = () => {
        let filtered = [...warnings];

        // Filter by status
        if (filterStatus === 'resolved') {
            filtered = filtered.filter(w => w.resolved);
        } else if (filterStatus === 'unresolved') {
            filtered = filtered.filter(w => !w.resolved);
        }

        // Filter by severity
        if (severityFilter !== 'all') {
            filtered = filtered.filter(w => {
                const difference = calculateAbsDifference(w.flowRate1, w.flowRate2);
                if (severityFilter === 'critical') return difference >= 40;
                if (severityFilter === 'warning') return difference >= 20 && difference < 40;
                if (severityFilter === 'notice') return difference < 20;
                return true;
            });
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


    // Add function to calculate absolute difference
    const calculateAbsDifference = (flow1, flow2) => {
        return Math.abs(Number(flow1) - Number(flow2));
    };

    // Add function to determine severity
    const getSeverityInfo = (difference) => {
        if (difference >= 40) {
            return {
                level: 'critical',
                color: '#dc2626',
                bgGradient: 'from-red-50 to-red-100',
                borderColor: 'border-red-500',
                icon: <AlertOutlined style={{ fontSize: '24px', color: '#dc2626' }} />,
                text: 'Nguy hiểm'
            };
        } else if (difference >= 20) {
            return {
                level: 'warning',
                color: '#d97706',
                bgGradient: 'from-amber-50 to-amber-100',
                borderColor: 'border-amber-500',
                icon: <ExclamationCircleOutlined style={{ fontSize: '24px', color: '#d97706' }} />,
                text: 'Cảnh báo'
            };
        } else {
            return {
                level: 'notice',
                color: '#2563eb',
                bgGradient: 'from-blue-50 to-blue-100',
                borderColor: 'border-blue-500',
                icon: <WarningOutlined style={{ fontSize: '24px', color: '#2563eb' }} />,
                text: 'Chú ý'
            };
        }
    };

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
        <div className="mt-5 mb-5 w-full px-4 md:w-11/12 lg:w-3/4 mx-auto">
            <div className="p-3 md:p-6 rounded-xl glassmorphism">
                <div className="flex flex-col gap-4 md:gap-6">
                    {/* Header with Title and Back button */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-blue-100">
                        <div className="flex items-center gap-4 w-full sm:flex-1">
                            <Button 
                                icon={<ArrowLeftOutlined />}
                                onClick={() => navigate(-1)}
                                className="flex items-center border border-red-600 text-red-600 bg-white/50 hover:bg-red-50 shrink-0"
                            >
                                Trở về
                            </Button>
                            <Title level={4} className="!text-blue-900/90 !mb-0 flex items-center gap-2 flex-1 max-w-2xl text-base md:text-lg">
                                <WarningOutlined className="text-yellow-600 shrink-0" />
                                <span className="flex-1">Cảnh báo vỡ ống nước</span>
                            </Title>
                        </div>
                    </div>

                    {/* Filters Section */}
                    <div className="flex flex-col gap-4 p-3 md:p-4 bg-white/10 rounded-xl border border-blue-100 mt-3 mb-3 glassmorphism">
                        <div className="text-blue-900 font-medium mb-1">Bộ lọc</div>
                        <div className="flex flex-col md:flex-row flex-wrap gap-4">
                            {/* Date Filter */}
                            <div className="flex flex-col gap-2 w-full sm:w-auto">
                                <span className="text-sm text-gray-600">Thời gian</span>
                                <DatePicker 
                                    locale={locale}
                                    onChange={(date) => setDateFilter(date)}
                                    placeholder="Chọn ngày"
                                    className="border border-blue-600 text-blue-600 bg-white/50 w-full sm:min-w-[200px]"
                                    format="DD/MM/YYYY"
                                    allowClear
                                />
                            </div>

                            {/* Status and Severity Filters - Unchanged except adding responsive containers */}
                            <div className="flex flex-col sm:flex-row gap-4 w-full">
                                <div className="flex flex-col gap-2 w-full sm:w-auto">
                                    {/* Existing Status Filter */}
                                    <span className="text-sm text-gray-600">Trạng thái</span>
                                    <Radio.Group 
                                        value={filterStatus} 
                                        onChange={e => setFilterStatus(e.target.value)}
                                        className=" p-1 rounded-lg flex flex-wrap"
                                    >
                                        <Space size={8} className="flex flex-wrap">
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

                                <div className="flex flex-col gap-2 w-full sm:w-auto">
                                    {/* Existing Severity Filter */}
                                    <span className="text-sm text-gray-600">Mức độ nghiêm trọng</span>
                                    <Radio.Group 
                                        value={severityFilter}
                                        onChange={e => setSeverityFilter(e.target.value)}
                                        className=" p-1 rounded-lg flex flex-wrap"
                                    >
                                        <Space size={8} className="flex flex-wrap">
                                            <Radio.Button 
                                                value="all" 
                                                className="border border-gray-600 text-gray-600 hover:text-gray-700 hover:border-gray-700 bg-white/50"
                                            >
                                                Tất cả
                                            </Radio.Button>
                                            <Radio.Button 
                                                value="critical" 
                                                className="border border-red-600 text-red-600 hover:text-red-700 hover:border-red-700 bg-white/50"
                                            >
                                                Nguy hiểm
                                            </Radio.Button>
                                            <Radio.Button 
                                                value="warning" 
                                                className="border border-amber-600 text-amber-600 hover:text-amber-700 hover:border-amber-700 bg-white/50"
                                            >
                                                Cảnh báo
                                            </Radio.Button>
                                            <Radio.Button 
                                                value="notice" 
                                                className="border border-blue-600 text-blue-600 hover:text-blue-700 hover:border-blue-700 bg-white/50"
                                            >
                                                Chú ý
                                            </Radio.Button>
                                        </Space>
                                    </Radio.Group>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Warning Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getFilteredWarnings().map((warning) => {
                        const absDifference = calculateAbsDifference(warning.flowRate1, warning.flowRate2);
                        const severity = getSeverityInfo(absDifference);
                        
                        return (
                            <div key={warning.id} className="transform transition-all duration-300 hover:-translate-y-1 relative">
                                {/* Add Badge as an absolute positioned element */}
                                <Badge.Ribbon
                                    text={
                                        <div className="flex items-center gap-1">
                                            {warning.resolved ? (
                                                <CheckCircleOutlined className="text-white" />
                                            ) : (
                                                <CloseCircleOutlined className="text-white" />
                                            )}
                                            <span>{warning.resolved ? "Đã xử lý" : "Chưa xử lý"}</span>
                                        </div>
                                    }
                                    color={warning.resolved ? "#10b981" : "#ef4444"}  // Custom colors for better visibility
                                    className="font-medium text-sm"
                                />
                                <Card 
                                    className={`w-full transition-all duration-300 ${
                                        warning.resolved 
                                            ? 'bg-transparent border-green-500' 
                                            : `bg-transparent ${severity.borderColor}`
                                    } border-2 shadow-lg hover:shadow-xl rounded-xl`}
                                    bodyStyle={{ padding: '0.75rem' }}  // Giảm padding của card
                                >
                                    <div className="flex flex-col gap-3">  {/* Giảm gap từ 4 xuống 3 */}
                                        {/* Header - Severity and Time */}
                                        <div className="flex items-center justify-between pb-2 border-b border-gray-200">  {/* Giảm padding bottom */}
                                            <div className="flex items-center gap-2">  {/* Giảm gap */}
                                                {severity.icon}
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-base" style={{ color: severity.color }}>  {/* Giảm font size và weight */}
                                                        {severity.text}
                                                    </span>
                                                    <span className="text-xs text-gray-600">  {/* Giảm font size */}
                                                        {dayjs(warning.timestamp).format('DD/MM/YYYY HH:mm:ss')}
                                                    </span>
                                                </div>
                                            </div>
                                            {/* Remove the old Badge here */}
                                        </div>

                                        {/* Flow Rates */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">  {/* Giảm gap */}
                                            <div className={`p-2 rounded-lg bg-white/30 border ${warning.resolved ? 'border-green-200' : severity.borderColor}`}>  {/* Giảm padding */}
                                                <div className="text-xs text-gray-600 mb-1">Cảm biến 1</div>  {/* Giảm font size */}
                                                <div className="text-lg font-bold font-mono min-w-[90px]" style={{ color: severity.color }}>  {/* Giảm font size và min-width */}
                                                    {formatFlow(warning?.flowRate1)} L/min
                                                </div>
                                            </div>
                                            <div className={`p-2 rounded-lg bg-white/30 border ${warning.resolved ? 'border-green-200' : severity.borderColor}`}>
                                                <div className="text-xs text-gray-600 mb-1">Cảm biến 2</div>
                                                <div className="text-lg font-bold font-mono min-w-[90px]" style={{ color: severity.color }}>
                                                    {formatFlow(warning?.flowRate2)} L/min
                                                </div>
                                            </div>
                                        </div>

                                        {/* Difference */}
                                        <div className={`p-2 rounded-lg bg-white/30 border ${warning.resolved ? 'border-green-200' : severity.borderColor}`}>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-600">Chênh lệch</span>  {/* Giảm font size */}
                                                <div className="text-base font-bold font-mono min-w-[90px] text-right" style={{ color: severity.color }}>
                                                    {formatFlow(absDifference)} L/min
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="pt-2 border-t border-gray-200 flex justify-end items-center gap-2">  {/* Giảm padding top */}
                                            <span className="text-xs text-gray-600">  {/* Giảm font size */}
                                                Đánh dấu đã xử lý
                                            </span>
                                            <CustomCheckbox
                                                checked={warning.resolved || false}
                                                onChange={(e) => handleResolveChange(warning, e.target.checked)}
                                                id={warning.id}
                                            />
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default WarningsList;
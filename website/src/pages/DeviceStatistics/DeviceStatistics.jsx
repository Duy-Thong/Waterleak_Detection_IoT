import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDatabase, ref, onValue, off } from "firebase/database";
import { Typography, Button, Card, Statistic, Spin, Alert, DatePicker, Radio } from 'antd';
import { ArrowLeftOutlined, DropboxOutlined, DashboardOutlined, CalendarOutlined, RiseOutlined, FundOutlined, ClockCircleOutlined, WarningOutlined, ThunderboltOutlined } from '@ant-design/icons';
import Navbar from '../../components/Navbar';
import { useUser } from '../../contexts/UserContext';
import RequireLogin from '../../components/RequireLogin';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

const { RangePicker } = DatePicker;
const { Title: AntTitle } = Typography;

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const StatisticCard = ({ title, value, suffix, className, icon }) => (
    <Card className={`glassmorphism transition-all hover:shadow-sm p-2 ${className}`} size="small">
        <Statistic
            title={
                <span className="text-gray-600 text-xs sm:text-sm flex items-center gap-2">
                    {icon}
                    {title}
                </span>
            }
            value={value}
            suffix={suffix}
            className="text-center"
            valueStyle={{ fontSize: '1rem' }}
        />
    </Card>
);

const DeviceStatistics = () => {
    const { deviceId } = useParams();
    const navigate = useNavigate();
    const { userId } = useUser();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deviceData, setDeviceData] = useState(null);
    const [dateRange, setDateRange] = useState([null, null]);
    const [viewType, setViewType] = useState('daily');

    useEffect(() => {
        if (!userId || !deviceId) return;

        const db = getDatabase();
        const deviceRef = ref(db, `devices/${deviceId}`);
        setLoading(true);

        // Set up real-time listener
        const unsubscribe = onValue(deviceRef, (snapshot) => {
            if (snapshot.exists()) {
                setDeviceData(snapshot.val());
                setError(null);
            } else {
                setError("Không tìm thấy dữ liệu thiết bị");
            }
            setLoading(false);
        }, (error) => {
            setError("Lỗi khi tải dữ liệu: " + error.message);
            setLoading(false);
        });

        // Cleanup function
        return () => {
            off(deviceRef);
        };
    }, [userId, deviceId]);

    const processData = useMemo(() => {
        if (!deviceData?.flow_sensor) return null;

        const data = Object.values(deviceData.flow_sensor);
        let filteredData = data;

        if (dateRange[0] && dateRange[1]) {
            filteredData = data.filter(item => {
                const itemDate = new Date(item.timestamp);
                return itemDate >= dateRange[0] && itemDate <= dateRange[1];
            });
        }

        // Calculate volume (L) from flow rate (L/min) and time duration
        const calculateVolume = (flowRate, durationSeconds) => {
            return (flowRate * durationSeconds) / 60; // Convert to liters
        };

        // Calculate statistics based on view type
        const dailyUsage = filteredData.reduce((acc, curr) => {
            const date = new Date(curr.timestamp).toLocaleDateString();
            const avgFlowRate = (curr.sensor1 + curr.sensor2) / 2; // L/min
            const volume = calculateVolume(avgFlowRate, 5); // Assuming 5 seconds between readings
            acc[date] = (acc[date] || 0) + volume;
            return acc;
        }, {});

        const monthlyUsage = filteredData.reduce((acc, curr) => {
            const date = new Date(curr.timestamp);
            const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
            const avgFlowRate = (curr.sensor1 + curr.sensor2) / 2;
            const volume = calculateVolume(avgFlowRate, 5);
            acc[monthKey] = (acc[monthKey] || 0) + volume;
            return acc;
        }, {});

        const hourlyUsage = filteredData.reduce((acc, curr) => {
            const hour = new Date(curr.timestamp).getHours();
            const avgFlowRate = (curr.sensor1 + curr.sensor2) / 2;
            const volume = calculateVolume(avgFlowRate, 5);
            acc[hour] = (acc[hour] || 0) + volume;
            return acc;
        }, {});

        // Sort hourly data
        const sortedHourlyUsage = Object.fromEntries(
            Array.from({ length: 24 }, (_, i) => [i, hourlyUsage[i] || 0])
        );

        // Add new calculations
        const instantFlows = filteredData.map(item => (item.sensor1 + item.sensor2) / 2);
        const peakFlow = Math.max(...instantFlows);
        const minFlow = Math.min(...instantFlows);

        // Calculate standard deviation
        const mean = instantFlows.reduce((a, b) => a + b) / instantFlows.length;
        const variance = instantFlows.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / instantFlows.length;
        const stdDev = Math.sqrt(variance);

        // Calculate operating time (when flow > 0)
        const operatingTime = filteredData.filter(item => (item.sensor1 + item.sensor2) / 2 > 0).length * 5; // multiply by 5 seconds

        // Calculate total volume
        const totalVolume = filteredData.reduce((sum, item) => {
            const avgFlowRate = (item.sensor1 + item.sensor2) / 2;
            return sum + calculateVolume(avgFlowRate, 5);
        }, 0);

        const activeHours = Object.entries(hourlyUsage)
            .filter(([_, value]) => value > 0).length;
        
        const unusualFlows = filteredData.filter(item => {
            const avgFlow = (item.sensor1 + item.sensor2) / 2;
            return avgFlow > mean + (2 * stdDev); // Flows outside 2 standard deviations
        }).length;

        const maxHourlyUsage = Math.max(...Object.values(sortedHourlyUsage));
        const peakHour = Object.entries(sortedHourlyUsage)
            .find(([_, value]) => value === maxHourlyUsage)?.[0];

        return {
            dailyUsage,
            monthlyUsage,
            hourlyUsage: sortedHourlyUsage,
            totalFlow: totalVolume,
            averageFlow: filteredData.length > 0 
                ? totalVolume / (filteredData.length * 5 / 60) // average L/min
                : 0,
            peakFlow,
            minFlow,
            flowVariability: stdDev,
            operatingMinutes: Math.round(operatingTime / 60), // Convert seconds to minutes
            activeHours,
            unusualFlows,
            peakHour: parseInt(peakHour),
            maxHourlyUsage,
        };
    }, [deviceData, dateRange]);

    const chartConfigs = useMemo(() => ({
        daily: {
            data: processData?.dailyUsage,
            title: 'Lưu lượng nước theo ngày'
        },
        monthly: {
            data: processData?.monthlyUsage,
            title: 'Lưu lượng nước theo tháng'
        },
        hourly: {
            data: processData?.hourlyUsage,
            title: 'Lưu lượng nước theo giờ'
        }
    }), [processData]);

    const renderChart = useMemo(() => (chartData) => {
        if (!chartData) return null;

        const config = chartConfigs[viewType];

        return (
            <div className="rounded-lg p-3 backdrop-blur-sm h-[300px]">
                <AntTitle level={5} className="mb-2 flex items-center gap-2">
                    <DropboxOutlined className="text-blue-500" />
                    {config.title}
                </AntTitle>
                <Bar
                    data={{
                        labels: Object.keys(config.data),
                        datasets: [{
                            label: 'Lưu lượng (L)',
                            data: Object.values(config.data),
                            backgroundColor: 'rgba(54, 162, 235, 0.3)',
                            borderColor: 'rgba(54, 162, 235, 0.8)',
                            borderWidth: 1
                        }]
                    }}
                    options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            y: { 
                                beginAtZero: true,
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.1)'
                                }
                            },
                            x: {
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.1)'
                                }
                            }
                        }
                    }}
                />
            </div>
        );
    }, [viewType, chartConfigs]);

    const renderHeader = () => (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 mt-12 bg-white/40 p-4 rounded-lg backdrop-blur-sm gap-4 shadow-sm">
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate(`/device/${deviceId}`)}
                    size="middle"
                    className="shadow-sm"
                >
                    Quay lại
                </Button>
                <AntTitle level={3} className="!m-0 text-gray-800 truncate font-bold">
                    {deviceData?.name || deviceId}
                </AntTitle>
            </div>
            <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0">
                <RangePicker 
                    onChange={(dates) => setDateRange(dates)}
                    size="middle"
                    className="w-full sm:w-auto shadow-sm"
                />
                <Radio.Group 
                    value={viewType} 
                    onChange={e => setViewType(e.target.value)}
                    size="middle"
                    className="w-full sm:w-auto shadow-sm"
                >
                    <Radio.Button value="daily">Ngày</Radio.Button>
                    <Radio.Button value="monthly">Tháng</Radio.Button>
                    <Radio.Button value="hourly">Giờ</Radio.Button>
                </Radio.Group>
            </div>
        </div>
    );

    const renderStatistics = () => (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
            <StatisticCard
                title="Tổng nước"
                value={chartData?.totalFlow.toFixed(1)}
                suffix="L"
                icon={<DropboxOutlined className="text-blue-500" />}
            />
            <StatisticCard
                title="Lưu lượng TB"
                value={chartData?.averageFlow.toFixed(1)}
                suffix="L/s"
                icon={<DashboardOutlined className="text-green-500" />}
            />
            <StatisticCard
                title="Cao nhất"
                value={chartData?.peakFlow.toFixed(1)}
                suffix="L/s"
                icon={<RiseOutlined className="text-red-500" />}
            />
            <StatisticCard
                title="Biến động"
                value={chartData?.flowVariability.toFixed(1)}
                suffix="L/s"
                icon={<FundOutlined className="text-purple-500" />}
            />
            <StatisticCard
                title="Giờ hoạt động"
                value={chartData?.activeHours}
                suffix="/24h"
                icon={<ClockCircleOutlined className="text-cyan-500" />}
            />
            <StatisticCard
                title="Giờ cao điểm"
                value={chartData?.peakHour}
                suffix="h"
                icon={<ThunderboltOutlined className="text-yellow-500" />}
            />
            <StatisticCard
                title="Bất thường"
                value={chartData?.unusualFlows}
                suffix="lần"
                icon={<WarningOutlined className="text-orange-500" />}
            />
            <StatisticCard
                title="T.gian chạy"
                value={chartData?.operatingMinutes}
                suffix="ph"
                icon={<ClockCircleOutlined className="text-cyan-500" />}
            />
        </div>
    );

    if (!userId) {
        return <RequireLogin />;
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Spin size="large" />
            </div>
        );
    }

    if (error) {
        return (
            <Alert
                message="Error"
                description={error}
                type="error"
                showIcon
                className="m-4"
            />
        );
    }

    const chartData = processData;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-100 via-blue-200 to-blue-100">
            <Navbar />
            <div className="container mx-auto px-4 pt-16 pb-4">
                <div className="max-w-[75%] mx-auto">
                    <>
                        <div className="mb-6">
                            {renderHeader()}
                        </div>
                        {error ? (
                            <Alert
                                message="Lỗi"
                                description={error}
                                type="error"
                                showIcon
                                className="mb-4"
                            />
                        ) : loading ? (
                            <div className="flex justify-center items-center h-48">
                                <Spin />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {renderStatistics()}
                                <div className="bg-white/50 rounded-lg p-3 backdrop-blur-sm min-h-[300px] sm:min-h-[400px]">
                                    {renderChart(chartData)}
                                </div>
                            </div>
                        )}
                    </>
                </div>
            </div>
        </div>
    );
};

export default DeviceStatistics;

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDatabase, ref, get } from "firebase/database";
import { Typography, Button, Card, Statistic, Spin, Alert, DatePicker, Radio } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
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
import { Line, Bar } from 'react-chartjs-2';

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

const StatisticCard = ({ title, value, suffix, className }) => (
    <Card className={`glassmorphism transition-all hover:shadow-sm p-2 ${className}`} size="small">
        <Statistic
            title={<span className="text-gray-600 text-xs sm:text-sm">{title}</span>}
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
        const fetchData = async () => {
            if (!userId || !deviceId) return;

            try {
                const db = getDatabase();
                const deviceRef = ref(db, `devices/${deviceId}`);
                const snapshot = await get(deviceRef);

                if (snapshot.exists()) {
                    setDeviceData(snapshot.val());
                    setError(null);
                } else {
                    setError("Không tìm thấy dữ liệu thiết bị");
                }
            } catch (err) {
                setError("Lỗi khi tải dữ liệu: " + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
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

        // Calculate statistics based on view type
        const dailyUsage = filteredData.reduce((acc, curr) => {
            const date = new Date(curr.timestamp).toLocaleDateString();
            acc[date] = (acc[date] || 0) + (curr.sensor1 + curr.sensor2) / 2;
            return acc;
        }, {});

        const monthlyUsage = filteredData.reduce((acc, curr) => {
            const date = new Date(curr.timestamp);
            const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
            acc[monthKey] = (acc[monthKey] || 0) + (curr.sensor1 + curr.sensor2) / 2;
            return acc;
        }, {});

        const hourlyUsage = filteredData.reduce((acc, curr) => {
            const hour = new Date(curr.timestamp).getHours();
            acc[hour] = (acc[hour] || 0) + (curr.sensor1 + curr.sensor2) / 2;
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
        const operatingTime = filteredData.filter(item => (item.sensor1 + item.sensor2) / 2 > 0).length;

        // Detect potential leaks (continuous flow for extended periods)
        const LEAK_THRESHOLD = 0.1; // L/s
        const consecutiveReadings = 10; // Number of consecutive readings to consider
        let potentialLeak = false;
        
        for (let i = 0; i < filteredData.length - consecutiveReadings; i++) {
            const segment = filteredData.slice(i, i + consecutiveReadings);
            if (segment.every(item => (item.sensor1 + item.sensor2) / 2 > LEAK_THRESHOLD)) {
                potentialLeak = true;
                break;
            }
        }

        return {
            dailyUsage,
            monthlyUsage,
            hourlyUsage: sortedHourlyUsage,
            totalFlow: filteredData.reduce((sum, item) => sum + (item.sensor1 + item.sensor2) / 2, 0),
            averageFlow: filteredData.length > 0 
                ? filteredData.reduce((sum, item) => sum + (item.sensor1 + item.sensor2) / 2, 0) / filteredData.length
                : 0,
            peakFlow,
            minFlow,
            flowVariability: stdDev,
            operatingMinutes: operatingTime,
            potentialLeak,
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
            <div className="bg-white/50 rounded-lg p-3 backdrop-blur-sm h-[300px]">
                <AntTitle level={5} className="mb-2">{config.title}</AntTitle>
                <Bar
                    data={{
                        labels: Object.keys(config.data),
                        datasets: [{
                            label: 'Lưu lượng (L)',
                            data: Object.values(config.data),
                            backgroundColor: 'rgba(54, 162, 235, 0.5)',
                            borderColor: 'rgba(54, 162, 235, 1)',
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
                            y: { beginAtZero: true }
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
            <StatisticCard
                title="Tổng nước"
                value={chartData?.totalFlow.toFixed(1)}
                suffix="L"
            />
            <StatisticCard
                title="Lưu lượng TB"
                value={chartData?.averageFlow.toFixed(1)}
                suffix="L/s"
            />
            <StatisticCard
                title="Số ngày"
                value={chartData?.dailyUsage ? Object.keys(chartData.dailyUsage).length : 0}
                suffix="ngày"
            />
            <StatisticCard
                title="Cao nhất"
                value={chartData?.peakFlow.toFixed(1)}
                suffix="L/s"
            />
            <StatisticCard
                title="Biến động"
                value={chartData?.flowVariability.toFixed(1)}
                suffix="L/s"
            />
            <StatisticCard
                title="T.gian chạy"
                value={chartData?.operatingMinutes}
                suffix="ph"
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200">
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
                                {chartData?.potentialLeak && (
                                    <Alert
                                        message="Cảnh báo rò rỉ!"
                                        type="warning"
                                        showIcon
                                        banner
                                    />
                                )}
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

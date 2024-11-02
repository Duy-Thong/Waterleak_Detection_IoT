import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Typography, Table, Button, DatePicker, Input, Row, Col, Select, message, Slider } from 'antd';
import moment from 'moment';
import { useUser } from '../contexts/UserContext';
import Navbar from '../components/Navbar';
import "./style.css";
import RequireLogin from '../components/RequireLogin';
import { getAuth } from 'firebase/auth';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const DeviceHistory = () => {
    const { deviceId } = useParams();
    const navigate = useNavigate();
    const [deviceName, setDeviceName] = useState('');
    const [historyData, setHistoryData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [dateRange, setDateRange] = useState(null);
    const [sensor1Range, setSensor1Range] = useState([0, 1000]);
    const [sensor2Range, setSensor2Range] = useState([0, 1000]);
    const [sensorDifference, setSensorDifference] = useState(null);
    const [relayState, setRelayState] = useState('');
    const { userId, logout } = useUser();

    useEffect(() => {
        const fetchDeviceDetails = async () => {
            try {
                const auth = getAuth();
                const token = await auth.currentUser?.getIdToken();
                
                if (!token) {
                    throw new Error('No authentication token found');
                }

                // Fetch device name
                const deviceResponse = await axios.get(
                    `https://esp8266firebase-2f31a-default-rtdb.asia-southeast1.firebasedatabase.app/devices/${deviceId}.json`,
                    {
                        params: {
                            auth: token
                        }
                    }
                );
                
                if (deviceResponse.data && deviceResponse.data.name) {
                    setDeviceName(deviceResponse.data.name);
                }

                // Fetch history data
                const response = await axios.get(
                    `https://esp8266firebase-2f31a-default-rtdb.asia-southeast1.firebasedatabase.app/devices/${deviceId}/flow_sensor.json`,
                    {
                        params: {
                            auth: token
                        }
                    }
                );
                const data = response.data;
                if (data) {
                    const historyArray = Object.values(data);
                    console.log("Fetched Data:", historyArray);
                    setHistoryData(historyArray);
                    setFilteredData(historyArray);

                    const timestamps = historyArray.map(item => moment(item.timestamp, 'YYYY-MM-DD HH:mm:ss'));
                    console.log("Parsed Timestamps:", timestamps);

                    const minDate = moment.min(timestamps);
                    const maxDate = moment.max(timestamps).add(1, 'days');
                    if (minDate.isValid() && maxDate.isValid()) {
                        setDateRange([minDate, maxDate]);
                    } else {
                        setDateRange([moment().startOf('day'), moment().endOf('day')]);
                    }
                }
            } catch (error) {
                console.error("Error fetching device history:", error);
                if (error.response?.status === 401 || error.response?.status === 403) {
                    message.error('Unauthorized access. Please login again.');
                    logout();
                    navigate('/login');
                } else {
                    message.error('Error loading device history');
                }
            }
        };

        fetchDeviceDetails();
    }, [deviceId, logout, navigate]);

    const handleFilter = () => {
        let filtered = historyData;

        if (dateRange && dateRange[0] && dateRange[1] && dateRange[0].isValid() && dateRange[1].isValid()) {
            console.log("Filtering by Date Range:", dateRange);

            filtered = filtered.filter(item => {
                const itemTime = moment(item.timestamp, 'YYYY-MM-DD HH:mm:ss');
                return itemTime.isBetween(dateRange[0].startOf('day'), dateRange[1].endOf('day'));
            });
        }

        filtered = filtered.filter(item =>
            item.sensor1 >= sensor1Range[0] && item.sensor1 <= sensor1Range[1]
        );

        filtered = filtered.filter(item =>
            item.sensor2 >= sensor2Range[0] && item.sensor2 <= sensor2Range[1]
        );

        if (sensorDifference !== null) {
            filtered = filtered.filter(item => Math.abs(item.sensor1 - item.sensor2) >= sensorDifference);
        }

        if (relayState) {
            filtered = filtered.filter(item => item.relayState.toUpperCase() === relayState.toUpperCase());
        }

        setFilteredData(filtered);
    };

    const columns = [
        { title: 'Thời gian', dataIndex: 'timestamp', key: 'timestamp' },
        { title: 'Cảm biến 1', dataIndex: 'sensor1', key: 'sensor1' },
        { title: 'Cảm biến 2', dataIndex: 'sensor2', key: 'sensor2' },
        { title: 'Trạng thái Relay', dataIndex: 'relayState', key: 'relayState' },
    ];

    const handleDeleteHistory = async () => {
        const confirmDelete = window.confirm('Bạn có chắc chắn muốn xóa lịch sử thiết bị?');
        if (confirmDelete) {
            try {
                const auth = getAuth();
                const token = await auth.currentUser?.getIdToken();
                
                if (!token) {
                    throw new Error('No authentication token found');
                }

                const payload = {
                    flow_sensor: null,
                    relay: {
                        control: relayState ? String(relayState).toUpperCase() : 'OFF',
                    },
                    name : deviceName
                };
                await axios.put(
                    `https://esp8266firebase-2f31a-default-rtdb.asia-southeast1.firebasedatabase.app/devices/${deviceId}.json`,
                    payload,
                    {
                        params: {
                            auth: token
                        }
                    }
                );

                setHistoryData([]);
                setFilteredData([]);
                message.success('Lịch sử thiết bị đã được xóa thành công.');
            } catch (error) {
                console.error("Error deleting device history:", error);
                if (error.response?.status === 401 || error.response?.status === 403) {
                    message.error('Unauthorized access. Please login again.');
                    logout();
                    navigate('/login');
                } else {
                    message.error('Xóa lịch sử thiết bị không thành công.');
                }
            }
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (!userId) {
        return <RequireLogin />;
    }

    return (
        <div className="bg-gradient-to-r from-white to-blue-200 min-h-screen">
            <Navbar onLogout={handleLogout} />
            <div className="p-8 flex flex-col items-center pt-20">
                <Title level={2} className="text-gray-800">Lịch Sử Thiết Bị: {deviceName}</Title>
                <Button
                    onClick={() => navigate('/home')}
                    className="bg-blue-600 text-white hover:bg-blue-500 transition duration-300 mb-4"
                >
                    Quay về trang chính
                </Button>

                <div className="glassmorphism-filter-section p-4 rounded shadow-lg w-full max-w-3xl">
                    <Row gutter={16}>
                        <Col span={24}>
                            <Text>Chọn Khoảng Ngày</Text>
                            <RangePicker
                                onChange={(dates) => {
                                    if (dates && dates.length === 2) {
                                        // Convert Day.js to moment
                                        const startDate = moment(dates[0].toISOString());
                                        const endDate = moment(dates[1].toISOString());
                                        setDateRange([startDate, endDate]);
                                    } else {
                                        setDateRange(null);
                                    }
                                }}
                                className="w-full"
                                format="DD/MM/YYYY"
                            />
                        </Col>
                    </Row>
                    <Row gutter={16} className="mt-2">
                        <Col span={12}>
                            <Text>Giá Trị Cảm Biến 1</Text>
                            <Slider
                                range
                                min={0}
                                max={500}
                                value={sensor1Range}
                                onChange={setSensor1Range}
                            />
                        </Col>
                        <Col span={12}>
                            <Text>Giá Trị Cảm Biến 2</Text>
                            <Slider
                                range
                                min={0}
                                max={500}
                                value={sensor2Range}
                                onChange={setSensor2Range}
                            />
                        </Col>
                    </Row>
                    <Row gutter={16} className="mt-2">
                        <Col span={12}>
                            <Text>Chênh Lệch</Text>
                            <Input
                                value={sensorDifference}
                                onChange={(e) => setSensorDifference(Number(e.target.value))}
                                placeholder="Nhập giá trị chênh lệch"
                            />
                        </Col>
                        <Col span={12}>
                            <Text>Trạng Thái Relay</Text>
                            <Select
                                value={relayState}
                                onChange={(value) => setRelayState(value)}
                                style={{ width: '100%' }}
                            >
                                <Option value="">Tất cả</Option>
                                <Option value="ON">ON</Option>
                                <Option value="OFF">OFF</Option>
                            </Select>
                        </Col>
                    </Row>
                    <div className="flex justify-between mt-4">
                        <Button onClick={handleFilter} type="primary">Lọc Dữ Liệu</Button>
                        <Button onClick={handleDeleteHistory} type="danger" className='bg-red-500 text-white'>Xóa Lịch Sử</Button>
                    </div>
                </div>

                <Table
                    dataSource={filteredData}
                    columns={columns}
                    rowKey="timestamp"
                    className="mt-4 w-full max-w-3xl glassmorphism-table"
                    pagination={true}
                />

            </div>
        </div>
    );
};

export default DeviceHistory;

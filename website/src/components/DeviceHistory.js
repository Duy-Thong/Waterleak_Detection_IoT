import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Typography, Table, Button, DatePicker, Input, Row, Col, Select, message, Slider } from 'antd';
import moment from 'moment';
import { useUser } from '../contexts/UserContext';
import Navbar from './Navbar';
import "./style.css";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const DeviceHistory = () => {
    const { deviceId } = useParams();
    const navigate = useNavigate();
    const [historyData, setHistoryData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [dateRange, setDateRange] = useState([moment().startOf('day'), moment().endOf('day')]); // Initialize to today
    const [sensor1Range, setSensor1Range] = useState([0, 1000]);
    const [sensor2Range, setSensor2Range] = useState([0, 1000]);
    const [sensorDifference, setSensorDifference] = useState(null);
    const [relayState, setRelayState] = useState('');
    const { userId, logout } = useUser();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await axios.get(
                    `https://esp8266firebase-2f31a-default-rtdb.asia-southeast1.firebasedatabase.app/devices/${deviceId}/flow_sensor.json`
                );
                const data = response.data;
                if (data) {
                    const historyArray = Object.values(data);
                    setHistoryData(historyArray);
                    setFilteredData(historyArray);

                    const timestamps = historyArray.map(item => moment(item.timestamp, 'YYYY-MM-DD HH:mm:ss'));
                    const minDate = moment.min(timestamps);
                    const maxDate = moment.max(timestamps).add(1, 'days');

                    if (minDate.isValid() && maxDate.isValid()) {
                        setDateRange([minDate, maxDate]);
                    }
                }
            } catch (error) {
                console.error("Error fetching device history:", error);
            }
        };

        fetchHistory();
    }, [deviceId]);

    const columns = [
        { title: 'Thời gian', dataIndex: 'timestamp', key: 'timestamp' },
        { title: 'Cảm biến 1', dataIndex: 'sensor1', key: 'sensor1' },
        { title: 'Cảm biến 2', dataIndex: 'sensor2', key: 'sensor2' },
        { title: 'Trạng thái Relay', dataIndex: 'relayState', key: 'relayState' },
    ];

    const handleFilter = () => {
        let filtered = historyData;

        if (dateRange[0] && dateRange[1]) {
            filtered = filtered.filter(item =>
                moment(item.timestamp, 'YYYY-MM-DD HH:mm:ss').isBetween(
                    dateRange[0].startOf('day'),
                    dateRange[1].endOf('day')
                )
            );
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

        const sortedData = filtered.sort((a, b) => moment(b.timestamp) - moment(a.timestamp));
        setFilteredData(sortedData);
    };

    const handleDeleteHistory = async () => {
        const confirmDelete = window.confirm('Bạn có chắc chắn muốn xóa lịch sử thiết bị?');
        if (confirmDelete) {
            try {
                const payload = {
                    flow_sensor: null,
                    relay: {
                        control: relayState ? String(relayState).toUpperCase() : 'OFF',
                    }
                };
                await axios.put(
                    `https://esp8266firebase-2f31a-default-rtdb.asia-southeast1.firebasedatabase.app/devices/${deviceId}.json`,
                    payload
                );

                setHistoryData([]);
                setFilteredData([]);
                message.success('Lịch sử thiết bị đã được xóa thành công.');
            } catch (error) {
                console.error("Error deleting device history:", error);
                message.error('Xóa lịch sử thiết bị không thành công.');
            }
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (!userId) {
        return (
            <div className="flex flex-col min-h-screen bg-gray-100">
                <div className="flex flex-col items-center justify-center flex-1">
                    <p className="text-red-500"><strong>Bạn cần đăng nhập để sử dụng các chức năng này.</strong></p>
                    <Button
                        className="mt-4"
                        type="primary"
                        onClick={() => navigate('/login')}
                    >
                        Đăng Nhập
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-r from-white to-blue-200 min-h-screen">
            <Navbar onLogout={handleLogout} />
            <div className="p-8 flex flex-col items-center pt-20">
                <Title level={2} className="text-gray-800">Lịch Sử Thiết Bị</Title>
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
                                value={dateRange}
                                onChange={(dates) => {
                                    if (dates) {
                                        setDateRange(dates);
                                    } else {
                                        setDateRange([null, null]);
                                    }
                                }}
                                style={{ width: '100%' }}
                            />
                        </Col>
                    </Row>
                    <Row gutter={16} className="mt-2">
                        <Col span={12}>
                            <Text>Giá Trị Cảm Biến 1</Text>
                            <Slider
                                range
                                min={0}
                                max={1000}
                                value={sensor1Range}
                                onChange={setSensor1Range}
                                valueLabelDisplay="auto"
                            />
                        </Col>
                        <Col span={12}>
                            <Text>Giá Trị Cảm Biến 2</Text>
                            <Slider
                                range
                                min={0}
                                max={1000}
                                value={sensor2Range}
                                onChange={setSensor2Range}
                                valueLabelDisplay="auto"
                            />
                        </Col>
                    </Row>
                    <Row gutter={16} className="mt-2">
                        <Col span={12}>
                            <Text>Chênh Lệch</Text>
                            <Input
                                value={sensorDifference}
                                onChange={(e) => setSensorDifference(Number(e.target.value))}
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
                    className="mt-4 w-full max-w-3xl"
                    pagination={true}
                />
            </div>
        </div>
    );
};

export default DeviceHistory;

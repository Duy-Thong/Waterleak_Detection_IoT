import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Typography, Table, Button, DatePicker, Input, Row, Col, Select, message, Slider } from 'antd';
import moment from 'moment';
import { getDatabase, ref } from 'firebase/database';
import { useUser } from '../contexts/UserContext';
import Navbar from './Navbar';
const { Title, Text } = Typography;
const { Option } = Select;

const DeviceHistory = () => {
    const { deviceId } = useParams();
    const navigate = useNavigate();
    const [historyData, setHistoryData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [sensor1Range, setSensor1Range] = useState([0, 1000]);
    const [sensor2Range, setSensor2Range] = useState([0, 1000]);
    const [sensorDifference, setSensorDifference] = useState(null);
    const [relayState, setRelayState] = useState('');
    const { userId, logout } = useUser();

    useEffect(() => {
        const db = getDatabase();
        const userRef = ref(db, 'users/' + userId + '/devices');
    }, [userId]);

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

                    setStartDate(minDate);
                    setEndDate(maxDate);
                }
            } catch (error) {
                console.error("Error fetching device history:", error);
            }
        };

        fetchHistory();
        const interval = setInterval(fetchHistory, 10000); // Cập nhật mỗi 10 giây

        return () => clearInterval(interval); // Xóa interval khi component unmount
    }, [deviceId]);

    const columns = [
        { title: 'Thời gian', dataIndex: 'timestamp', key: 'timestamp' },
        { title: 'Cảm biến 1', dataIndex: 'sensor1', key: 'sensor1' },
        { title: 'Cảm biến 2', dataIndex: 'sensor2', key: 'sensor2' },
        { title: 'Trạng thái Relay', dataIndex: 'relayState', key: 'relayState' },
    ];

    const handleFilter = () => {
        let filtered = historyData;

        if (startDate) {
            filtered = filtered.filter(item =>
                moment(item.timestamp, 'YYYY-MM-DD HH:mm:ss').isSameOrAfter(startDate.startOf('day'))
            );
        }

        if (endDate) {
            filtered = filtered.filter(item =>
                moment(item.timestamp, 'YYYY-MM-DD HH:mm:ss').isSameOrBefore(endDate.endOf('day'))
            );
        }

        // Filter based on sensor 1 range
        filtered = filtered.filter(item =>
            item.sensor1 >= sensor1Range[0] && item.sensor1 <= sensor1Range[1]
        );

        // Filter based on sensor 2 range
        filtered = filtered.filter(item =>
            item.sensor2 >= sensor2Range[0] && item.sensor2 <= sensor2Range[1]
        );

        if (sensorDifference !== null) {
            filtered = filtered.filter(item => Math.abs(item.sensor1 - item.sensor2) >= sensorDifference);
        }

        if (relayState) {
            filtered = filtered.filter(item => item.relayState.toUpperCase() === relayState.toUpperCase());
        }

        // Sort filtered data by timestamp in descending order
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
        <div >
            <Navbar onLogout={handleLogout} />

            <div className="p-8 bg-gray-100 min-h-screen">

                <div className="flex justify-between items-center mb-4">
                    <Title level={2}>Lịch Sử Thiết Bị</Title>
                    <Button
                        onClick={() => navigate('/home')}
                        className="bg-blue-600 text-white hover:bg-blue-500 transition duration-300"
                    >
                        Quay về trang chính
                    </Button>
                </div>
                <hr className="my-4" />
                <div className='w-full flex flex-col items-center'>
                    <div className="filter-section mb-4 bg-white p-4 rounded shadow-md w-full">
                        <Row gutter={16}>
                            <Col span={12}>
                                <Text>Ngày Bắt Đầu</Text>
                                <DatePicker
                                    value={startDate ? moment(startDate) : null}
                                    onChange={(date) => setStartDate(date)}
                                    style={{ width: '100%' }}
                                />
                            </Col>
                            <Col span={12}>
                                <Text>Ngày Kết Thúc</Text>
                                <DatePicker
                                    value={endDate ? moment(endDate) : null}
                                    onChange={(date) => setEndDate(date)}
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
                                <Text>Chênh Lệch </Text>
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
                        <Button onClick={handleFilter} type="primary" className="mt-4">Lọc Dữ Liệu</Button>
                        <Button onClick={handleDeleteHistory} type="danger" className="ml-2 mt-4">Xóa Lịch Sử</Button>
                    </div>
                </div>
                <Table
                    dataSource={filteredData}
                    columns={columns}
                    rowKey="timestamp"
                    className="mt-4"
                    pagination={true}
                />
            </div>
        </div>
    );
};

export default DeviceHistory;

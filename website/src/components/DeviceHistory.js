import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Typography, Table, Button, DatePicker, Input, Row, Col, Select, message, Modal } from 'antd';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;

const DeviceHistory = () => {
    const { deviceId } = useParams();
    const navigate = useNavigate();
    const [historyData, setHistoryData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [sensor1MinValue, setSensor1MinValue] = useState(0);
    const [sensor1MaxValue, setSensor1MaxValue] = useState(1000);
    const [sensor2MinValue, setSensor2MinValue] = useState(0);
    const [sensor2MaxValue, setSensor2MaxValue] = useState(1000);
    const [sensorDifference, setSensorDifference] = useState(null);
    const [relayState, setRelayState] = useState('');

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
                console.error("Lỗi khi lấy dữ liệu lịch sử thiết bị:", error);
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

        if (sensor1MinValue !== undefined) {
            filtered = filtered.filter(item => item.sensor1 >= Number(sensor1MinValue));
        }
        if (sensor1MaxValue !== undefined) {
            filtered = filtered.filter(item => item.sensor1 <= Number(sensor1MaxValue));
        }

        if (sensor2MinValue !== undefined) {
            filtered = filtered.filter(item => item.sensor2 >= Number(sensor2MinValue));
        }
        if (sensor2MaxValue !== undefined) {
            filtered = filtered.filter(item => item.sensor2 <= Number(sensor2MaxValue));
        }

        if (sensorDifference !== null) {
            filtered = filtered.filter(item => Math.abs(item.sensor1 - item.sensor2) >= sensorDifference);
        }

        if (relayState) {
            filtered = filtered.filter(item => item.relayState.toUpperCase() === relayState.toUpperCase());
        }

        setFilteredData(filtered);
    };

    const handleDeleteHistory = async () => {
        const confirmDelete = window.confirm('Bạn có chắc chắn muốn xóa lịch sử thiết bị?');
        const currentRelayState = relayState;
        if (confirmDelete) {
            try {
                // Construct the payload
                const payload = {
                    flow_sensor: null,
                    relay: {
                        control: relayState ? String(relayState).toUpperCase() : 'OFF', // Cung cấp giá trị mặc định nếu relayState không hợp lệ
                    }
                };
                await axios.put(
                    `https://esp8266firebase-2f31a-default-rtdb.asia-southeast1.firebasedatabase.app/devices/${deviceId}.json`,
                    payload
                );

                // Clear history data
                setHistoryData([]);
                setFilteredData([]);
                message.success('Lịch sử thiết bị đã được xóa thành công.');
            } catch (error) {
                console.error("Lỗi khi xóa lịch sử thiết bị:", error);
                message.error('Xóa lịch sử thiết bị không thành công.');
            }
        }
    };


    return (
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
                            <Text>Giá Trị Tối Thiểu Cảm Biến 1</Text>
                            <Input
                                value={sensor1MinValue}
                                onChange={(e) => setSensor1MinValue(Number(e.target.value))}
                            />
                        </Col>
                        <Col span={12}>
                            <Text>Giá Trị Tối Đa Cảm Biến 1</Text>
                            <Input
                                value={sensor1MaxValue}
                                onChange={(e) => setSensor1MaxValue(Number(e.target.value))}
                            />
                        </Col>
                    </Row>
                    <Row gutter={16} className="mt-2">
                        <Col span={12}>
                            <Text>Giá Trị Tối Thiểu Cảm Biến 2</Text>
                            <Input
                                value={sensor2MinValue}
                                onChange={(e) => setSensor2MinValue(Number(e.target.value))}
                            />
                        </Col>
                        <Col span={12}>
                            <Text>Giá Trị Tối Đa Cảm Biến 2</Text>
                            <Input
                                value={sensor2MaxValue}
                                onChange={(e) => setSensor2MaxValue(Number(e.target.value))}
                            />
                        </Col>
                    </Row>
                    <Row gutter={16} className="mt-2">
                        <Col span={8}>
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <Text>Ngưỡng Chênh Lệch Cảm Biến</Text>
                                <Input
                                    value={sensorDifference}
                                    onChange={(e) => setSensorDifference(Number(e.target.value))}
                                    style={{ marginTop: 8 }} // Optional: space between label and input
                                />
                            </div>
                        </Col>
                        <Col span={8}>
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <Text>Trạng Thái Relay</Text>
                                <Select
                                    value={relayState}
                                    onChange={(value) => setRelayState(value)}
                                    style={{ width: '100%', marginTop: 8 }} // Optional: space between label and select
                                >
                                    <Option value="">Tất cả</Option>
                                    <Option value="ON">BẬT</Option>
                                    <Option value="OFF">TẮT</Option>
                                </Select>
                            </div>
                        </Col>
                        <Col span={8}>
                            <Button type="primary" onClick={handleFilter} style={{ width: '100%', marginTop: 30 }}>
                                Tìm Kiếm
                            </Button>
                        </Col>
                    </Row>
                </div>
                <div className="mt-4 w-full">
                    <Table
                        dataSource={filteredData}
                        columns={columns}
                        rowKey="timestamp"
                        pagination={{ pageSize: 5 }}
                    />
                </div>
                <Button
                    type="danger"
                    onClick={handleDeleteHistory}
                    style={{ marginTop: 16 }}
                    className='bg-red-700 text-white hover:bg-red-600 transition duration-300' 
                >
                    Xóa Lịch Sử
                </Button>
            </div>
        </div>
    );
};

export default DeviceHistory;

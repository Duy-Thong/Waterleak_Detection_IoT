import React from 'react';
import { Card, Row, Col, Progress } from 'antd';
import './style.css'; // Import the styles

const CurrentDeviceData = ({ latestData }) => (
    latestData && (
        <Card className="current-device-data-card w-3/4 glassmorphism">
            <h1 className="text-xl mb-4 text-center">Dữ Liệu Thiết Bị Hiện Tại</h1>
            <h3 className="mb-4 text-center"><strong>Thời gian:</strong> {latestData.timestamp}</h3>
            <Row gutter={[16, 16]} justify="center">
                {/* Sensor 1 Circular Progress */}
                <Col xs={24} sm={12} className="flex flex-col items-center">
                    <h3 className="text-lg font-normal mb-2">Cảm Biến 1</h3>
                    <Progress
                        type="circle"
                        percent={(latestData.sensor1 / 1000) * 100}
                        format={percent => `${latestData.sensor1} L/phút`}
                        strokeColor={{
                            '0%': '#FF5F6D',
                            '100%': '#FFC371',
                        }}
                        width={150} // Increase the width of the progress circle
                    />
                </Col>

                <Col xs={24} sm={12} className="flex flex-col items-center">
                    <h3 className="text-lg font-medium mb-2">Cảm Biến 2</h3>
                    <Progress
                        type="circle"
                        percent={(latestData.sensor2 / 1000) * 100}
                        format={percent => `${latestData.sensor2} L/phút`}
                        strokeColor={{
                            '0%': '#00C9FF',
                            '100%': '#92FE9D',
                        }}
                        width={150} // Increase the width of the progress circle
                    />
                </Col>
            </Row>
        </Card>
    )
);

export default CurrentDeviceData;

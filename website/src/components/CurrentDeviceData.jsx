import { Card, Row, Col, Progress, Button } from 'antd';

const CurrentDeviceData = ({ latestData, deviceId, navigate }) => {
    return (
        <Card className="w-3/4 mb-3 glassmorphism">
            <h1 className="text-xl mb-4 text-center">Dữ Liệu Thiết Bị Hiện Tại</h1>
            <Row gutter={[16, 16]} justify="center">
                <Col xs={24} sm={12} className="flex flex-col items-center">
                    <h3 className="text-lg font-normal mb-2">Cảm Biến 1</h3>
                    <Progress
                        type="circle"
                        percent={((latestData?.sensor1 || 0) / 1000) * 100}
                        format={() => `${latestData?.sensor1 || 0} L/h`}
                        strokeColor={{
                            '0%': '#FF5F6D',
                            '100%': '#FFC371',
                        }}
                        width={150}
                    />
                </Col>

                <Col xs={24} sm={12} className="flex flex-col items-center">
                    <h3 className="text-lg font-medium mb-2">Cảm Biến 2</h3>
                    <Progress
                        type="circle"
                        percent={((latestData?.sensor2 || 0) / 1000) * 100}
                        format={() => `${latestData?.sensor2 || 0} L/h`}
                        strokeColor={{
                            '0%': '#00C9FF',
                            '100%': '#92FE9D',
                        }}
                        width={150}
                    />
                </Col>
            </Row>
            
            <div className="flex justify-center mt-4">
                <Button 
                    onClick={() => navigate(`/device/${deviceId}/history`)}
                    size="middle"
                    style={{ 
                        borderColor: '#52c41a', 
                        color: '#52c41a',
                        backgroundColor: 'rgba(255, 255, 255, 0.5)'
                    }}
                    ghost
                >
                    Xem lịch sử
                </Button>
            </div>
        </Card>
    );
};

export default CurrentDeviceData;

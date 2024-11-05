import { Card, Row, Col, Progress, Button } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';

const CurrentDeviceData = ({ latestData, deviceId, navigate }) => {
    const formatDateTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleString('vi-VN'); 
    };

    return (
        <Card className="w-3/4 mb-3 glassmorphism">
            <h1 className="text-xl mb-4 text-center">Dữ Liệu Thiết Bị Hiện Tại</h1>
            <p className="text-center text-gray-600 mb-4">
                Thời gian: {formatDateTime(latestData?.timestamp)}
            </p>
            <h3 className="text-lg font-medium mb-2">{}</h3>
            <Row gutter={[16, 16]} justify="center">
                <Col xs={12} sm={12} className="flex flex-col items-center">
                    <h3 className="text-lg font-medium mb-2">Cảm Biến 1</h3>
                    <Progress
                        type="circle"
                        percent={((latestData?.sensor1 || 0) / 200) * 100}
                        format={() => `${latestData?.sensor1 || 0} L/min`}
                        strokeColor={{
                            '0%': '#FF5F6D',
                            '100%': '#FFC371',
                        }}
                        width={150}
                        className="scale-90 sm:scale-100"
                    />
                </Col>

                <Col xs={12} sm={12} className="flex flex-col items-center">
                    <h3 className="text-lg font-medium mb-2">Cảm Biến 2</h3>
                    <Progress
                        type="circle"
                        percent={((latestData?.sensor2 || 0) / 200) * 100}
                        format={() => `${latestData?.sensor2 || 0} L/min`}
                        strokeColor={{
                            '0%': '#00C9FF',
                            '100%': '#92FE9D',
                        }}
                        width={150}
                        className="scale-90 sm:scale-100"
                    />
                </Col>
            </Row>

            <div className="flex justify-center mt-4">
                <Button
                    onClick={() => navigate(`/device/${deviceId}/history`)}
                    size="large"
                    icon={<HistoryOutlined />}
                    style={{
                        borderColor: '#52c41a',
                        color: '#52c41a',
                        backgroundColor: 'rgba(255, 255, 255, 0.5)',
                        height: '30px',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '180px',
                        justifyContent: 'center',
                        padding: '4px 15px'
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

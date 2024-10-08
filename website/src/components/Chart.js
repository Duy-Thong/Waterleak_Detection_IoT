import React from 'react';
import { Line } from 'react-chartjs-2';

const Chart = ({ chartData }) => (
    chartData && (
        <div className="w-3/4 flex justify-center items-center">
            <Line
                data={chartData}
                options={{
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Dữ liệu cảm biến theo thời gian', // Cập nhật tiêu đề thành tiếng Việt
                        },
                        legend: {
                            display: true,
                            position: 'top', // Vị trí của chú thích
                            labels: {
                                color: '#333', // Màu sắc chữ cho chú thích
                                boxWidth: 20, // Kích thước hình vuông cho màu sắc
                            },
                        },
                        tooltip: {
                            enabled: true,
                            mode: 'index', // Chế độ hiển thị tooltip
                            intersect: false, // Hiển thị tooltip khi hover gần điểm
                            callbacks: {
                                label: function (tooltipItem) {
                                    const label = tooltipItem.dataset.label || '';
                                    const value = tooltipItem.raw;
                                    return `${label}: ${value}`;
                                }
                            }
                        }
                    },
                }}
            />
        </div>
    )
);

export default Chart;

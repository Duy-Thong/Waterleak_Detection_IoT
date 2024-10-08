import React from 'react';
import { Line } from 'react-chartjs-2';

const Chart = ({ chartData }) => (
    chartData && (
        <div className="w-full max-w-2xl mt-6">
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
                            callbacks: {
                                label: function (tooltipItem) {
                                    const label = tooltipItem.dataset.label || ''; // Nhãn của dữ liệu
                                    const value = tooltipItem.raw; // Giá trị dữ liệu
                                    return `${label}: ${value}`; // Định dạng hiển thị tooltip
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

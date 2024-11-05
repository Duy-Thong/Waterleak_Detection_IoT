import React from 'react';
import { Line } from 'react-chartjs-2';

const Chart = ({ chartData }) => (
    chartData && (
        <div className="w-full flex justify-center items-center glassmorphism mt-3" style={{ minHeight: '300px' }}>
            <Line
                data={chartData}
                options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    aspectRatio: 1,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Dữ liệu cảm biến trong 24 giờ qua',
                        },
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: '#333',
                                boxWidth: 20,
                            },
                        },
                        tooltip: {
                            enabled: true,
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function (tooltipItem) {
                                    const label = tooltipItem.dataset.label || '';
                                    const value = tooltipItem.raw;
                                    return `${label}: ${value}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        },
                        x: {
                            type: 'category',
                            ticks: {
                                maxTicksLimit: 12,
                                callback: function(value, index) {
                                    const date = new Date(this.getLabelForValue(value));
                                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                }
                            }
                        }
                    }
                }}
            />
        </div>
    )
);

export default Chart;
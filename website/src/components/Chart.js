import React from 'react';
import { Line } from 'react-chartjs-2';

const Chart = ({ chartData }) => (
    chartData && (
        <div className="w-3/4 flex justify-center items-center ">
            <Line
                data={chartData}
                options={{
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Dữ liệu cảm biến theo thời gian',
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
                }}
            />
        </div>
    )
);

export default Chart;

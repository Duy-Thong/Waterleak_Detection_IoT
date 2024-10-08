import React from 'react';
import { Line } from 'react-chartjs-2';

const Chart = ({ chartData }) => (
    chartData && (
        <div className="w-full max-w-2xl mt-6">
            <Line data={chartData} options={{
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Sensor Data Over Time'
                    }
                }
            }} />
        </div>
    )
);

export default Chart;

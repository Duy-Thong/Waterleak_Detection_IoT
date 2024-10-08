import React from 'react';
import GaugeChart from 'react-gauge-chart';

const CurrentDeviceData = ({ latestData }) => (
    latestData && (
        <div className="p-4 bg-green-200 rounded-lg shadow-md flex flex-col items-center justify-center">
            <h2 className="text-xl font-semibold mb-2">Current Device Data</h2>

            <p className="mb-4"><strong>Timestamp:</strong> {latestData.timestamp}</p>

            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-8">
                {/* Sensor 1 Gauge */}
                <div className="flex flex-col items-center w-full sm:w-1/2">
                    <h3 className="text-lg font-medium mb-2">Sensor 1</h3>
                    <GaugeChart
                        id="sensor1-gauge"
                        nrOfLevels={20}
                        percent={latestData.sensor1 / 1000} // Max value set to 1000
                        colors={['#FF5F6D', '#FFC371']}
                        arcWidth={0.3}
                        textColor="#000000"
                        needleColor="#345243"
                        needleBaseColor="#345243"
                    />
                    <p className="mt-2 text-lg font-bold"><strong>{latestData.sensor1} L/min</strong></p>
                </div>

                {/* Sensor 2 Gauge */}
                <div className="flex flex-col items-center w-full sm:w-1/2">
                    <h3 className="text-lg font-medium mb-2">Sensor 2</h3>
                    <GaugeChart
                        id="sensor2-gauge"
                        nrOfLevels={20}
                        percent={latestData.sensor2 / 1000} // Max value set to 1000
                        colors={['#00C9FF', '#92FE9D']}
                        arcWidth={0.3}
                        textColor="#000000"
                        needleColor="#345243"
                        needleBaseColor="#345243"
                    />
                    <p className="mt-2 text-lg font-bold"><strong>{latestData.sensor2} L/min</strong></p>
                </div>
            </div>
        </div>
    )
);

export default CurrentDeviceData;

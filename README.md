# Water Leak Detection IoT System

A smart IoT system for water leak detection with WiFi configuration capability.

## Features

- Easy WiFi configuration through web interface
- Real-time water leak detection and alerts
- Web-based monitoring dashboard
- Simple and responsive design
- User-friendly interface in Vietnamese
- Automatic device reconnection after configuration
- Low power consumption
- Support for multiple sensor nodes

## Requirements

- ESP8266 NodeMCU
- Water leak sensor
- Arduino IDE
- Required Libraries:
    - ESP8266WiFi
    - ESP8266WebServer
    - DNSServer
    - EEPROM

## Setup & Installation

1. Clone this repository:
        ```sh
        git clone https://github.com/yourusername/Waterleak_Detection_IoT.git
        ```
2. Open the project in Arduino IDE.
3. Install the required libraries:
        - Go to `Sketch` > `Include Library` > `Manage Libraries...`
        - Search for and install the following libraries:
                - ESP8266WiFi
                - ESP8266WebServer
                - DNSServer
                - EEPROM
4. Configure your WiFi credentials in the `embed.cpp` file:
        ```cpp
        const char* ssid = "your_SSID";
        const char* password = "your_PASSWORD";
        ```
5. Upload the code to your ESP8266 NodeMCU.
6. Open the Serial Monitor to check the device status and IP address.
7. Access the web interface using the IP address shown in the Serial Monitor.

## Usage

- Open the web interface in your browser.
- Configure the WiFi settings if not already configured.
- Monitor the real-time water leak status and receive alerts.

## Troubleshooting

- **No WiFi Connection**: Ensure that the SSID and password are correctly configured in the `embed.cpp` file.
- **No Sensor Data**: Check the connections between the ESP8266 and the water leak sensor.
- **Web Interface Not Accessible**: Verify the IP address in the Serial Monitor and ensure your device is connected to the same network.

## Contributing

Contributions are welcome! Please fork this repository and submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by various IoT projects and tutorials available online.
- Special thanks to the open-source community for providing the necessary libraries and tools.
- Thanks to the contributors who helped improve this project.


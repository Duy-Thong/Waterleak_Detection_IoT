#if defined(ESP32)
#include <WiFi.h>
#elif defined(ESP8266)
#include <ESP8266WiFi.h>
#endif
#include <Firebase_ESP_Client.h>
#include <time.h>
#include <ArduinoJson.h>

// Wi-Fi credentials
#define WIFI_SSID "Phong402"
#define WIFI_PASSWORD "Phong402"

// Firebase configuration and helper libraries
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// Device and Firebase credentials
#define On_Board_LED 2
#define API_KEY "AIzaSyCR98EPOgJvByjRJPsapt15YsaEmHKGTcA"
#define DATABASE_URL "https://esp8266firebase-2f31a-default-rtdb.asia-southeast1.firebasedatabase.app"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

#define DEVICE_ID "emyeuptit2024" // ID thiết bị
unsigned long sendDataPrevMillis = 0;
const long sendDataIntervalMillis = 10000; // 10 giây
bool signupOK = false;

// Biến lưu dữ liệu cảm biến dòng chảy
float flowRate1 = 0.0;
float flowRate2 = 0.0;

// Chân cảm biến dòng chảy
#define FLOW_SENSOR_1_PIN 5
#define FLOW_SENSOR_2_PIN 4

volatile int flowCount1 = 0;
volatile int flowCount2 = 0;
float calibrationFactor1 = 4.5;
float calibrationFactor2 = 4.5;

// Chân điều khiển rơ le
#define RELAY_PIN 0
int entryID = 0;

// Prototype hàm
void IRAM_ATTR flowSensor1ISR();
void IRAM_ATTR flowSensor2ISR();
float getFlowRate(int flowCount, float calibrationFactor);
String formatTimestamp();
void checkAndCreateRelayPath();
void checkFlowRateDifference();

unsigned long flowCheckStartMillis = 0; // Thời gian bắt đầu kiểm tra lưu lượng
bool flowExceedsThreshold = false;      // Trạng thái chênh lệch lưu lượng
int exceedCount = 0;                    // Đếm số lần chênh lệch

void setup()
{
  Serial.begin(115200);
  Serial.println();
  pinMode(On_Board_LED, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);

  // Kết nối Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED)
  {
    Serial.print(".");
    digitalWrite(On_Board_LED, HIGH);
    delay(250);
    digitalWrite(On_Board_LED, LOW);
    delay(250);
  }
  digitalWrite(On_Board_LED, LOW);
  Serial.println("\nSuccessfully connected to WiFi");

  // Thiết lập Firebase
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  Serial.print("Signing up new user...");
  if (Firebase.signUp(&config, &auth, "", ""))
  {
    Serial.println("ok");
    signupOK = true;
  }
  else
  {
    Serial.printf("Error: %s\n", config.signer.signupError.message.c_str());
  }

  config.token_status_callback = tokenStatusCallback;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // Tạo đường dẫn rơ le nếu chưa tồn tại
  checkAndCreateRelayPath();

  // Thiết lập chân cảm biến dòng chảy
  pinMode(FLOW_SENSOR_1_PIN, INPUT);
  pinMode(FLOW_SENSOR_2_PIN, INPUT);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_1_PIN), flowSensor1ISR, RISING);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_2_PIN), flowSensor2ISR, RISING);

  // Cấu hình NTP để lấy thời gian thực
  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov");
}

void loop()
{
  // Kiểm tra kết nối Wi-Fi
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("WiFi not connected, trying to reconnect...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    return;
  }

  // Biến lưu trạng thái rơ le
  String relayState = "OFF"; // Giá trị mặc định

  // Đường dẫn trạng thái rơ le trong Firebase dưới nhánh devices
  String relayPath = "/devices/" + String(DEVICE_ID) + "/relay/control";
  if (Firebase.RTDB.getString(&fbdo, relayPath))
  {
    relayState = fbdo.stringData(); // Lấy trạng thái rơ le từ Firebase
    Serial.printf("Relay state from Firebase: %s\n", relayState.c_str());

    // Điều khiển rơ le dựa trên trạng thái nhận được
    if (relayState == "OFF")
    {
      digitalWrite(RELAY_PIN, HIGH);
      Serial.println("Relay turned OFF");
    }
    else if (relayState == "ON")
    {
      digitalWrite(RELAY_PIN, LOW);
      Serial.println("Relay turned ON");
    }
  }
  else
  {
    if (fbdo.errorReason() == "path not exist")
    {
      Serial.println("Relay path does not exist. Creating it with default value 'OFF'.");
      if (Firebase.RTDB.setString(&fbdo, relayPath, "OFF"))
      {
        Serial.println("Relay path created successfully.");
      }
      else
      {
        Serial.printf("Failed to create relay path: %s\n", fbdo.errorReason().c_str());
      }
    }
    else
    {
      Serial.printf("Failed to read relay state: %s\n", fbdo.errorReason().c_str());
    }
  }

  // Kiểm tra và gửi dữ liệu nếu đã đến thời gian gửi
  if (millis() - sendDataPrevMillis > sendDataIntervalMillis)
  {
    sendDataPrevMillis = millis();
    flowRate1 = getFlowRate(flowCount1, calibrationFactor1);
    flowRate2 = getFlowRate(flowCount2, calibrationFactor2);
    flowCount1 = 0;
    flowCount2 = 0;

    // Tạo JSON chứa dữ liệu cảm biến và trạng thái rơ le
    FirebaseJson flowSensorData;
    String timestamp = formatTimestamp();
    entryID++;
    flowSensorData.set("sensor1", flowRate1);
    flowSensorData.set("sensor2", flowRate2);
    flowSensorData.set("timestamp", timestamp);
    flowSensorData.set("relayState", relayState); // Thêm trạng thái rơ le

    // Đường dẫn để lưu dữ liệu cảm biến dòng chảy dưới nhánh devices
    String path = "/devices/" + String(DEVICE_ID) + "/flow_sensor";
    if (Firebase.RTDB.pushJSON(&fbdo, path.c_str(), &flowSensorData))
    {
      Serial.println("Flow sensor data pushed successfully.");
    }
    else
    {
      Serial.printf("Failed to push flow sensor data: %s\n", fbdo.errorReason().c_str());
    }

    // Kiểm tra chênh lệch lưu lượng nước
    checkFlowRateDifference();
  }
}

// ISR cho cảm biến dòng chảy 1
void IRAM_ATTR flowSensor1ISR()
{
  flowCount1++;
}

// ISR cho cảm biến dòng chảy 2
void IRAM_ATTR flowSensor2ISR()
{
  flowCount2++;
}

// Hàm tính toán lưu lượng nước
float getFlowRate(int flowCount, float calibrationFactor)
{
  return (flowCount / calibrationFactor);
}

// Hàm định dạng thời gian hiện tại
String formatTimestamp()
{
  time_t now;
  struct tm timeinfo;
  time(&now);
  localtime_r(&now, &timeinfo);
  char timeString[25];
  strftime(timeString, sizeof(timeString), "%Y-%m-%d %H:%M:%S", &timeinfo);
  return String(timeString);
}

// Kiểm tra và tạo đường dẫn cho rơ le nếu chưa tồn tại
void checkAndCreateRelayPath()
{
  String relayPath = "/devices/" + String(DEVICE_ID) + "/relay/control";
  if (!Firebase.RTDB.getString(&fbdo, relayPath))
  {
    Serial.println("Relay path not found, creating the path with default value 'OFF'.");
    if (Firebase.RTDB.setString(&fbdo, relayPath, "OFF"))
    {
      Serial.println("Relay path created successfully.");
    }
    else
    {
      Serial.printf("Failed to create relay path: %s\n", fbdo.errorReason().c_str());
    }
  }
  else
  {
    Serial.println("Relay path exists.");
  }
}

// Hàm kiểm tra chênh lệch lưu lượng nước
void checkFlowRateDifference()
{
  static float lastFlowRate1 = 0.0;
  static float lastFlowRate2 = 0.0;

  // Tính chênh lệch lưu lượng nước
  float flowDifference1 = abs(flowRate1 - lastFlowRate1);
  float flowDifference2 = abs(flowRate2 - lastFlowRate2);

  // Kiểm tra xem chênh lệch có lớn hơn 20 lít/phút không
  if (flowDifference1 > 20 || flowDifference2 > 20)
  {
    if (!flowExceedsThreshold)
    {
      flowCheckStartMillis = millis();
      flowExceedsThreshold = true; // Đặt cờ chênh lệch lưu lượng
      exceedCount = 1;             // Đếm số lần chênh lệch
    }
    else if (millis() - flowCheckStartMillis >= 10000)
    { // Kiểm tra liên tục trong 10 giây
      // Ngắt rơ le nếu chênh lệch liên tục trong 10 giây
      String relayPath = "/devices/" + String(DEVICE_ID) + "/relay/control";
      Firebase.RTDB.setString(&fbdo, relayPath, "OFF");
      Serial.println("Relay turned OFF due to flow rate difference exceeding threshold.");
      flowExceedsThreshold = false; // Reset cờ
    }
  }
  else
  {
    flowExceedsThreshold = false; // Reset cờ nếu chênh lệch không lớn hơn
  }

  // Cập nhật giá trị lưu lượng cuối cùng
  lastFlowRate1 = flowRate1;
  lastFlowRate2 = flowRate2;
}

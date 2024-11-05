#if defined(ESP32)
#include <WiFi.h>
#include <WebServer.h>
WebServer server(80);
#elif defined(ESP8266)
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
ESP8266WebServer server(80);
#endif

#include <Firebase_ESP_Client.h>
#include <time.h>
#include <ArduinoJson.h>
#include <EEPROM.h>

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

#define DEVICE_ID "HocVienBuuChinh"
unsigned long sendDataPrevMillis = 0;
const long sendDataIntervalMillis = 5000; // 10 seconds
bool signupOK = false;

// Sensor and relay variables
float flowRate1 = 0.0;
float flowRate2 = 0.0;
#define FLOW_SENSOR_1_PIN 5
#define FLOW_SENSOR_2_PIN 4
volatile int flowCount1 = 0;
volatile int flowCount2 = 0;
float calibrationFactor1 = 4.5;
float calibrationFactor2 = 4.5;
#define RELAY_PIN 0
int entryID = 0;

// WiFi settings
String ssid = "Phong402";
String password = "Phong402";
#define AP_SSID "WaterLeak_AP"
#define AP_PASS "12345678"

// HTML page for WiFi configuration
const char *html_page = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Cài Đặt WiFi</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            padding: 20px;
            background: #f0f2f5;
        }
        
        .container {
            max-width: 400px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        h1 {
            text-align: center;
            color: #1a73e8;
            margin-bottom: 20px;
            font-size: 24px;
        }
        
        form {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        label {
            font-weight: bold;
            color: #333;
        }
        
        input[type='text'],
        input[type='password'] {
            width: 100%;
            padding: 8px 12px;
            border: 2px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        input[type='text']:focus,
        input[type='password']:focus {
            border-color: #1a73e8;
            outline: none;
        }
        
        button {
            background: #1a73e8;
            color: white;
            border: none;
            padding: 12px;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.3s;
        }
        
        button:hover {
            background: #1557b0;
        }
        
        .footer {
            margin-top: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class='container'>
        <h1>Cài Đặt WiFi</h1>
        <form action='/save' method='POST'>
            <div class='form-group'>
                <label for='ssid'>Tên WiFi:</label>
                <input type='text' id='ssid' name='ssid' required>
            </div>
            <div class='form-group'>
                <label for='pass'>Mật khẩu:</label>
                <input type='password' id='pass' name='pass' required>
            </div>
            <button type='submit'>Lưu cài đặt</button>
        </form>
        <div class='footer'>
            Thiết bị sẽ tự động kết nối lại sau khi lưu thông tin
        </div>
    </div>
</body>
</html>
)rawliteral";

// Function prototypes
void IRAM_ATTR flowSensor1ISR();
void IRAM_ATTR flowSensor2ISR();
float getFlowRate(int flowCount, float calibrationFactor);
String formatTimestamp();
void checkAndCreateRelayPath();
void checkFlowRateDifference();
void setupAP();
void handleRoot();
void handleSave();
bool connectWiFi();
void initializeFirebase();
void checkAndCreateNamePath();
void saveWiFiCredentials(const String& ssid, const String& password);
void loadWiFiCredentials(String& ssid, String& password);
void reconnectWiFi();

unsigned long flowCheckStartMillis = 0;
bool flowExceedsThreshold = false;
int exceedCount = 0;
unsigned long lastWiFiCheckMillis = 0;
const long wifiCheckInterval = 30000; // Check every 30 seconds

void setup()
{
  Serial.begin(115200);
  Serial.println();
  pinMode(On_Board_LED, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);

  EEPROM.begin(512); // Initialize EEPROM with 512 bytes
  loadWiFiCredentials(ssid, password);

  // Attempt WiFi connection
  if (!connectWiFi())
  {
    setupAP(); // Start AP mode if WiFi connection fails
  }
  else
  {
    initializeFirebase(); // Initialize Firebase on successful WiFi connection
  }

  // Initialize sensors and hardware
  pinMode(FLOW_SENSOR_1_PIN, INPUT);
  pinMode(FLOW_SENSOR_2_PIN, INPUT);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_1_PIN), flowSensor1ISR, RISING);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_2_PIN), flowSensor2ISR, RISING);

  // Configure NTP
  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov");
}

bool connectWiFi()
{
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), password.c_str());
  Serial.print("Connecting to WiFi");

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20)
  {
    delay(500);
    Serial.print(".");
    digitalWrite(On_Board_LED, !digitalRead(On_Board_LED));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED)
  {
    digitalWrite(On_Board_LED, LOW);
    Serial.println("\nSuccessfully connected to WiFi");
    return true;
  }

  Serial.println("\nWiFi connection failed. Switching to AP mode...");
  return false;
}

void setupAP()
{
  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);
  Serial.println("AP Mode Started");
  Serial.print("AP IP address: ");
  Serial.println(WiFi.softAPIP());

  server.on("/", handleRoot);
  server.on("/save", HTTP_POST, handleSave);
  server.begin();
  Serial.println("HTTP server started");
}

void handleRoot()
{
  server.sendHeader("Content-Type", "text/html");
  server.send(200, "text/html", html_page);
}

void handleSave()
{
  if (server.hasArg("ssid") && server.hasArg("pass"))
  {
    ssid = server.arg("ssid");
    password = server.arg("pass");

    saveWiFiCredentials(ssid, password);

    server.send(200, "text/plain", "Settings saved. Re-attempting WiFi connection...");
    delay(1000);

    if (connectWiFi())
    {
      initializeFirebase();
    }
    else
    {
      setupAP();
    }
  }
  else
  {
    server.send(400, "text/plain", "SSID and password are required.");
  }
}

void initializeFirebase()
{
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

  checkAndCreateRelayPath();
  checkAndCreateNamePath();
}

void loop()
{
  // Add WiFi check at the beginning of loop
  if (millis() - lastWiFiCheckMillis >= wifiCheckInterval) {
    lastWiFiCheckMillis = millis();
    reconnectWiFi();
  }

  if (WiFi.status() != WL_CONNECTED)
  {
    server.handleClient(); // Handle server requests in AP mode
    return;
  }

  if (!signupOK)
  {
    Serial.println("Firebase not initialized. Attempting to initialize...");
    initializeFirebase();
    return;
  }

  String relayState = "OFF";
  String relayPath = "/devices/" + String(DEVICE_ID) + "/relay/control";
  if (Firebase.RTDB.getString(&fbdo, relayPath))
  {
    relayState = fbdo.stringData();
    Serial.printf("Current relay state from Firebase: %s\n", relayState.c_str());
    if (relayState == "OFF")
    {
      digitalWrite(RELAY_PIN, HIGH);
    }
    else if (relayState == "ON")
    {
      digitalWrite(RELAY_PIN, LOW);
    }
  }
  else if (fbdo.errorReason() == "path not exist")
  {
    if (Firebase.RTDB.setString(&fbdo, relayPath, "OFF"))
    {
      Serial.println("Relay path created successfully.");
    }
  }

  if (millis() - sendDataPrevMillis > sendDataIntervalMillis)
  {
    sendDataPrevMillis = millis();
    flowRate1 = getFlowRate(flowCount1, calibrationFactor1);
    flowRate2 = getFlowRate(flowCount2, calibrationFactor2);
    flowCount1 = 0;
    flowCount2 = 0;

    Serial.printf("Flow rates - Sensor 1: %.2f, Sensor 2: %.2f\n", flowRate1, flowRate2);

    FirebaseJson flowSensorData;
    flowSensorData.set("sensor1", flowRate1);
    flowSensorData.set("sensor2", flowRate2);
    flowSensorData.set("timestamp", formatTimestamp());
    flowSensorData.set("relayState", relayState);

    String path = "/devices/" + String(DEVICE_ID) + "/flow_sensor";
    if (!Firebase.RTDB.pushJSON(&fbdo, path.c_str(), &flowSensorData))
    {
      Serial.printf("Failed to push flow sensor data: %s\n", fbdo.errorReason().c_str());
    }

    checkFlowRateDifference();
  }
}

void IRAM_ATTR flowSensor1ISR()
{
  flowCount1++;
}

void IRAM_ATTR flowSensor2ISR()
{
  flowCount2++;
}

float getFlowRate(int flowCount, float calibrationFactor)
{
  return (flowCount / calibrationFactor);
}

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

void checkAndCreateRelayPath()
{
  String relayPath = "/devices/" + String(DEVICE_ID) + "/relay/control";
  if (!Firebase.RTDB.getString(&fbdo, relayPath))
  {
    if (Firebase.RTDB.setString(&fbdo, relayPath, "OFF"))
    {
      Serial.println("Relay path created successfully.");
    }
  }
}

void checkFlowRateDifference()
{
  float flowDifference = abs(flowRate1 - flowRate2);
  Serial.printf("Flow rate difference between sensors: %.2f\n", flowDifference);

  String relayPath = "/devices/" + String(DEVICE_ID) + "/relay/control";
  String currentRelayState;
  if (Firebase.RTDB.getString(&fbdo, relayPath)) {
    currentRelayState = fbdo.stringData();
  }

  if (flowDifference > 10 )
  {
    flowExceedsThreshold = true;
    exceedCount++;
    Serial.printf("Flow rate exceeded threshold. Exceed count: %d\n", exceedCount);
    if (exceedCount >= 1) // Thay đổi thành 2 để delay 10 giây
    {
      digitalWrite(RELAY_PIN, HIGH);
      if (Firebase.RTDB.setString(&fbdo, relayPath, "OFF"))
      {
        Serial.println("Emergency: Relay turned OFF due to leak detection");
        
        FirebaseJson warningData;
        warningData.set("timestamp", formatTimestamp());
        warningData.set("flowRate1", flowRate1);
        warningData.set("flowRate2", flowRate2);
        warningData.set("flowDifference", flowDifference);
        warningData.set("resolved", false);
        
        String warningPath = "/devices/" + String(DEVICE_ID) + "/warning";
        if (Firebase.RTDB.pushJSON(&fbdo, warningPath.c_str(), &warningData))
        {
          Serial.println("Warning data sent successfully");
        }
        else
        {
          Serial.printf("Failed to send warning data: %s\n", fbdo.errorReason().c_str());
        }
      }
      else
      {
        Serial.printf("Failed to update relay state in Firebase: %s\n", fbdo.errorReason().c_str());
      }
    }
  }
  else
  {
    flowExceedsThreshold = false;
    exceedCount = 0;
  }
}

void checkAndCreateNamePath()
{
  String namePath = "/devices/" + String(DEVICE_ID) + "/name";
  if (!Firebase.RTDB.getString(&fbdo, namePath))
  {
    Serial.println("Name path not found, creating with default device name.");
    if (Firebase.RTDB.setString(&fbdo, namePath, "Water Leak Detector"))
    {
      Serial.println("Name path created successfully.");
    }
    else
    {
      Serial.printf("Failed to create name path: %s\n", fbdo.errorReason().c_str());
    }
  }
  else
  {
    Serial.println("Name path exists.");
  }
}

void writeString(int startAddr, const String& data) {
  int len = data.length();
  EEPROM.write(startAddr, len);
  for (int i = 0; i < len; i++) {
    EEPROM.write(startAddr + 1 + i, data[i]);
  }
}

String readString(int startAddr) {
  int len = EEPROM.read(startAddr);
  String result = "";
  for (int i = 0; i < len; i++) {
    result += char(EEPROM.read(startAddr + 1 + i));
  }
  return result;
}

void saveWiFiCredentials(const String& ssid, const String& password) {
  writeString(0, ssid);
  writeString(32, password);
  EEPROM.commit();
}

void loadWiFiCredentials(String& ssid, String& password) {
  ssid = readString(0);
  password = readString(32);
}

void reconnectWiFi() {
  if (WiFi.status() != WL_CONNECTED) {
      WiFi.disconnect();
      WiFi.begin(ssid.c_str(), password.c_str());
  }
}

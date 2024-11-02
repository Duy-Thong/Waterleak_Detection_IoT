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

#define DEVICE_ID "emyeuptit2025"
unsigned long sendDataPrevMillis = 0;
const long sendDataIntervalMillis = 10000; // 10 seconds
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
const char *html_page = R"(
<!DOCTYPE html>
<html>
<head>
  <title>WiFi Setup</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <h1>WiFi Setup</h1>
  <form action="/save" method="POST">
    SSID: <input type="text" name="ssid"><br>
    Password: <input type="password" name="pass"><br>
    <input type="submit" value="Save">
  </form>
</body>
</html>
)";

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

unsigned long flowCheckStartMillis = 0;
bool flowExceedsThreshold = false;
int exceedCount = 0;

void setup()
{
  Serial.begin(115200);
  Serial.println();
  pinMode(On_Board_LED, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);

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
  server.send(200, "text/html", html_page);
}

void handleSave()
{
  if (server.hasArg("ssid") && server.hasArg("pass"))
  {
    ssid = server.arg("ssid");
    password = server.arg("pass");

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
  static float lastFlowRate1 = 0.0;
  static float lastFlowRate2 = 0.0;

  float flowDifference1 = abs(flowRate1 - lastFlowRate1);
  float flowDifference2 = abs(flowRate2 - lastFlowRate2);

  if (flowDifference1 > 10 || flowDifference2 > 10)
  {
    flowExceedsThreshold = true;
    exceedCount++;
    if (exceedCount >= 3)
    {
      digitalWrite(RELAY_PIN, LOW);
      Serial.println("Relay triggered due to large flow rate difference.");
    }
  }
  else
  {
    flowExceedsThreshold = false;
    exceedCount = 0;
  }

  lastFlowRate1 = flowRate1;
  lastFlowRate2 = flowRate2;
}

void checkAndCreateNamePath() {
    String namePath = "/devices/" + String(DEVICE_ID) + "/name";
    if (!Firebase.RTDB.getString(&fbdo, namePath)) {
        Serial.println("Name path not found, creating with default device name.");
        if (Firebase.RTDB.setString(&fbdo, namePath, "Water Leak Detector")) {
            Serial.println("Name path created successfully.");
        } else {
            Serial.printf("Failed to create name path: %s\n", fbdo.errorReason().c_str());
        }
    } else {
        Serial.println("Name path exists.");
    }
}

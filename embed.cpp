#if defined(ESP32)
  #include <WiFi.h>
#elif defined(ESP8266)
  #include <ESP8266WiFi.h>
#endif
#include <Firebase_ESP_Client.h>
#include <time.h>
#include <ArduinoJson.h>

#define WIFI_SSID "Phong402"
#define WIFI_PASSWORD "Phong402"
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

#define On_Board_LED 2
#define API_KEY "AIzaSyCR98EPOgJvByjRJPsapt15YsaEmHKGTcA"
#define DATABASE_URL "https://esp8266firebase-2f31a-default-rtdb.asia-southeast1.firebasedatabase.app"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

#define DEVICE_ID "emyeuptit2024"
unsigned long sendDataPrevMillis = 0;
const long sendDataIntervalMillis = 10000;
bool signupOK = false;

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

void IRAM_ATTR flowSensor1ISR();
void IRAM_ATTR flowSensor2ISR();
float getFlowRate(int flowCount, float calibrationFactor);
String formatTimestamp();
void checkAndCreateRelayPath();

void setup() {
  Serial.begin(115200);
  Serial.println();
  pinMode(On_Board_LED, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    digitalWrite(On_Board_LED, HIGH);
    delay(250);
    digitalWrite(On_Board_LED, LOW);
    delay(250);
  }
  
  digitalWrite(On_Board_LED, LOW);
  Serial.println("\nSuccessfully connected to WiFi");

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  Serial.print("Signing up new user...");
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("ok");
    signupOK = true;
  } else {
    Serial.printf("Error: %s\n", config.signer.signupError.message.c_str());
  }

  config.token_status_callback = tokenStatusCallback;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  checkAndCreateRelayPath();  

  pinMode(FLOW_SENSOR_1_PIN, INPUT);
  pinMode(FLOW_SENSOR_2_PIN, INPUT);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_1_PIN), flowSensor1ISR, RISING);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_2_PIN), flowSensor2ISR, RISING);
  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, trying to reconnect...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    return;
  }
  
  String relayPath = "/" + String(DEVICE_ID) + "/relay/control";  
  if (Firebase.RTDB.getString(&fbdo, relayPath)) {
    String relayState = fbdo.stringData();
    Serial.printf("Relay state from Firebase: %s\n", relayState.c_str());
    if (relayState == "OFF") {
      digitalWrite(RELAY_PIN, HIGH);
      Serial.println("Relay turned OFF");
    } else if (relayState == "ON") {
      digitalWrite(RELAY_PIN, LOW);
      Serial.println("Relay turned ON");
    }
  } else {
    if (fbdo.errorReason() == "path not exist") {
      Serial.println("Relay path does not exist. Creating it with default value 'OFF'.");
      if (Firebase.RTDB.setString(&fbdo, "/" + String(DEVICE_ID) + "/relay/control", "OFF")) {
        Serial.println("Relay path created successfully.");
      } else {
        Serial.printf("Failed to create relay path: %s\n", fbdo.errorReason().c_str());
      }
    } else {
      Serial.printf("Failed to read relay state: %s\n", fbdo.errorReason().c_str());
    }
  }

  if (millis() - sendDataPrevMillis > sendDataIntervalMillis) {
    sendDataPrevMillis = millis();
    flowRate1 = getFlowRate(flowCount1, calibrationFactor1);
    flowRate2 = getFlowRate(flowCount2, calibrationFactor2);
    flowCount1 = 0;
    flowCount2 = 0;

    FirebaseJson json;
    String timestamp = formatTimestamp();
    entryID++;

    FirebaseJson flowSensorData;
    flowSensorData.set("sensor1", flowRate1);
    flowSensorData.set("sensor2", flowRate2);
    flowSensorData.set("timestamp", timestamp);

    String path = "/" + String(DEVICE_ID) + "/flow_sensor";
    if (Firebase.RTDB.pushJSON(&fbdo, path.c_str(), &flowSensorData)) {
      Serial.println("Flow sensor data pushed successfully.");
    } else {
      Serial.printf("Failed to push flow sensor data: %s\n", fbdo.errorReason().c_str());
    }
  }
}

void IRAM_ATTR flowSensor1ISR() {
  flowCount1++;
}

void IRAM_ATTR flowSensor2ISR() {
  flowCount2++;
}

float getFlowRate(int flowCount, float calibrationFactor) {
  return (flowCount / calibrationFactor);
}

String formatTimestamp() {
  time_t now;
  struct tm timeinfo;
  time(&now);
  localtime_r(&now, &timeinfo);
  char timeString[25];
  strftime(timeString, sizeof(timeString), "%Y-%m-%d %H:%M:%S", &timeinfo);
  return String(timeString);
}

void checkAndCreateRelayPath() {
  String relayPath = "/" + String(DEVICE_ID) + "/relay/control";
  if (!Firebase.RTDB.getString(&fbdo, relayPath)) {
    Serial.println("Relay path not found, creating the path with default value 'OFF'.");
    if (Firebase.RTDB.setString(&fbdo, relayPath, "OFF")) {
      Serial.println("Relay path created successfully.");
    } else {
      Serial.printf("Failed to create relay path: %s\n", fbdo.errorReason().c_str());
    }
  } else {
    Serial.println("Relay path exists.");
  }
}

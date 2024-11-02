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

#define DEVICE_ID "emyeuptit2024" // Device ID
unsigned long sendDataPrevMillis = 0;
const long sendDataIntervalMillis = 10000; // 10 seconds
bool signupOK = false;

// Sensor data storage
float flowRate1 = 0.0;
float flowRate2 = 0.0;

// Flow sensor pins
#define FLOW_SENSOR_1_PIN 5
#define FLOW_SENSOR_2_PIN 4

volatile int flowCount1 = 0;
volatile int flowCount2 = 0;
float calibrationFactor1 = 4.5;
float calibrationFactor2 = 4.5;

// Relay control pin
#define RELAY_PIN 0
int entryID = 0;

// Function prototypes
void IRAM_ATTR flowSensor1ISR();
void IRAM_ATTR flowSensor2ISR();
float getFlowRate(int flowCount, float calibrationFactor);
String formatTimestamp();
void checkAndCreateRelayPath();
void checkFlowRateDifference();
bool authenticateUser();

unsigned long flowCheckStartMillis = 0; // Start time for flow check
bool flowExceedsThreshold = false;      // Flow rate difference state
int exceedCount = 0;                    // Count of exceedances

void setup()
{
  Serial.begin(115200);
  Serial.println();
  pinMode(On_Board_LED, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);

  // Connect to Wi-Fi
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

  // Set up Firebase
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  // Authenticate user
  if (authenticateUser())
  {
    Serial.println("User authenticated successfully.");
  }
  else
  {
    Serial.println("User authentication failed.");
    while (true)
      ; // Stop the program if authentication fails
  }

  config.token_status_callback = tokenStatusCallback;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // Create relay path if it does not exist
  checkAndCreateRelayPath();

  // Set up flow sensor pins
  pinMode(FLOW_SENSOR_1_PIN, INPUT);
  pinMode(FLOW_SENSOR_2_PIN, INPUT);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_1_PIN), flowSensor1ISR, RISING);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_2_PIN), flowSensor2ISR, RISING);

  // Configure NTP for real-time clock
  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov");
}

void loop()
{
  // Check Wi-Fi connection
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("WiFi not connected, trying to reconnect...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    return;
  }

  // Relay state variable
  String relayState = "OFF"; // Default value

  // Relay state path in Firebase under devices
  String relayPath = "/devices/" + String(DEVICE_ID) + "/relay/control";
  if (Firebase.RTDB.getString(&fbdo, relayPath))
  {
    relayState = fbdo.stringData(); // Get relay state from Firebase
    Serial.printf("Relay state from Firebase: %s\n", relayState.c_str());

    // Control relay based on received state
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

  // Check and send data if it's time to send
  if (millis() - sendDataPrevMillis > sendDataIntervalMillis)
  {
    sendDataPrevMillis = millis();
    flowRate1 = getFlowRate(flowCount1, calibrationFactor1);
    flowRate2 = getFlowRate(flowCount2, calibrationFactor2);
    flowCount1 = 0;
    flowCount2 = 0;

    // Create JSON containing sensor data and relay state
    FirebaseJson flowSensorData;
    String timestamp = formatTimestamp();
    entryID++;
    flowSensorData.set("sensor1", flowRate1);
    flowSensorData.set("sensor2", flowRate2);
    flowSensorData.set("timestamp", timestamp);
    flowSensorData.set("relayState", relayState); // Add relay state

    // Path to save flow sensor data under devices
    String path = "/devices/" + String(DEVICE_ID) + "/flow_sensor";

    if (Firebase.RTDB.pushJSON(&fbdo, path.c_str(), &flowSensorData))
    {
      Serial.println("Flow sensor data pushed successfully.");
    }
    else
    {
      Serial.printf("Failed to push flow sensor data: %s\n", fbdo.errorReason().c_str());
    }

    // Check for flow rate differences
    checkFlowRateDifference();
  }
}

// ISR for flow sensor 1
void IRAM_ATTR flowSensor1ISR()
{
  flowCount1++;
}

// ISR for flow sensor 2
void IRAM_ATTR flowSensor2ISR()
{
  flowCount2++;
}

// Function to calculate flow rate
float getFlowRate(int flowCount, float calibrationFactor)
{
  return (flowCount / calibrationFactor);
}

// Function to format current time
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

// Function to check and create relay path if it does not exist
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

// Function to check flow rate differences
void checkFlowRateDifference()
{
  static float lastFlowRate1 = 0.0;
  static float lastFlowRate2 = 0.0;

  // Calculate flow rate differences
  float flowDifference1 = abs(flowRate1 - lastFlowRate1);
  float flowDifference2 = abs(flowRate2 - lastFlowRate2);

  // Check if difference exceeds 20 liters/minute
  if (flowDifference1 > 20 || flowDifference2 > 20)
  {
    if (!flowExceedsThreshold)
    {
      flowCheckStartMillis = millis();
      flowExceedsThreshold = true; // Set flow difference flag
      exceedCount = 1;             // Count number of exceedances
    }
    else if (millis() - flowCheckStartMillis >= 10000)
    { // Continuous check for 10 seconds
      // Turn off relay if difference persists for 10 seconds
      String relayPath = "/devices/" + String(DEVICE_ID) + "/relay/control";
      Firebase.RTDB.setString(&fbdo, relayPath, "OFF");
      Serial.println("Relay turned OFF due to flow rate exceedance.");
    }
  }
  else
  {
    flowExceedsThreshold = false; // Reset threshold flag
    exceedCount = 0;              // Reset exceed count
  }

  // Update last flow rates
  lastFlowRate1 = flowRate1;
  lastFlowRate2 = flowRate2;
}

// Function to authenticate user
bool authenticateUser()
{
  auth.user.email = "device@gmail.com"; // Replace with your email
  auth.user.password = "device";       // Replace with your password
  if (Firebase.signIn(&auth, &fbdo))
  {
    return true; // User authenticated
  }
  else
  {
    Serial.printf("Authentication failed: %s\n", fbdo.errorReason().c_str());
    return false; // User not authenticated
  }
}

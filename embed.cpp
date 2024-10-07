//======================================== Including the libraries.
#if defined(ESP32)
  #include <WiFi.h>
#elif defined(ESP8266)
  #include <ESP8266WiFi.h>
#endif
#include <Firebase_ESP_Client.h>
#include <time.h>
#include <ArduinoJson.h> // ArduinoJson library for JSON handling

//======================================== Insert your network credentials.
#define WIFI_SSID "Phong402"
#define WIFI_PASSWORD "Phong402"

// Provide the token generation process info.
#include "addons/TokenHelper.h"

// Provide the RTDB payload printing info and other helper functions.
#include "addons/RTDBHelper.h"

// Defines the Digital Pin of the "On Board LED".
#define On_Board_LED 2

// Insert Firebase project API Key
#define API_KEY "AIzaSyCR98EPOgJvByjRJPsapt15YsaEmHKGTcA"

// Insert RTDB URL
#define DATABASE_URL "https://esp8266firebase-2f31a-default-rtdb.asia-southeast1.firebasedatabase.app"

// Define Firebase Data object.
FirebaseData fbdo;

// Define Firebase authentication.
FirebaseAuth auth;

// Define Firebase configuration.
FirebaseConfig config;

//======================================== Device ID
String device_id = "emyeuptit2025"; // Example device ID

//======================================== Millis variable to send/store data to Firebase database.
unsigned long sendDataPrevMillis = 0;
const long sendDataIntervalMillis = 10000; // Sends/stores data to Firebase database every 10 seconds.

// Boolean variable for sign-in status.
bool signupOK = false;

// Variables to store flow rate values
float flowRate1 = 0.0;
float flowRate2 = 0.0;

// Flow sensor pins (use GPIO numbers)
#define FLOW_SENSOR_1_PIN 5  // GPIO5 for D1
#define FLOW_SENSOR_2_PIN 4  // GPIO4 for D2

// Flow sensor variables
volatile int flowCount1 = 0;
volatile int flowCount2 = 0;
float calibrationFactor1 = 4.5; // Calibration factor for sensor 1
float calibrationFactor2 = 4.5; // Calibration factor for sensor 2

// Relay pin definition
#define RELAY_PIN 0  // Define the GPIO pin where relay is connected

// Define a counter for unique entry ID
int entryID = 0;

// Function prototypes
void IRAM_ATTR flowSensor1ISR();
void IRAM_ATTR flowSensor2ISR();
float getFlowRate(int flowCount, float calibrationFactor);
String formatTimestamp();
void checkAndCreateRelayPath();

void setup() {
  Serial.begin(115200);
  Serial.println();

  pinMode(On_Board_LED, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT); // Set relay pin as output

  // Connecting to WiFi
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

  // Assign the API key and RTDB URL
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  // Sign up
  Serial.print("Signing up new user...");
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("ok");
    signupOK = true;
  } else {
    Serial.printf("Error: %s\n", config.signer.signupError.message.c_str());
  }

  // Token generation
  config.token_status_callback = tokenStatusCallback; // see addons/TokenHelper.h
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // Check and create the relay path in Firebase
  checkAndCreateRelayPath();  

  // Setup flow sensor pins and interrupts
  pinMode(FLOW_SENSOR_1_PIN, INPUT);
  pinMode(FLOW_SENSOR_2_PIN, INPUT);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_1_PIN), flowSensor1ISR, RISING);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_2_PIN), flowSensor2ISR, RISING);

  // Set time for timestamp (Vietnam Time - UTC+7)
  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov");
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, trying to reconnect...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    return;
  }
  String relayPath = "/" + device_id + "/relay/control";
  // Check relay control from Firebase
  if (Firebase.RTDB.getString(&fbdo, relayPath)) {
    String relayState = fbdo.stringData();
    Serial.printf("Relay state from Firebase: %s\n", relayState.c_str());

    // Control relay based on Firebase value
    if (relayState == "OFF") {
      digitalWrite(RELAY_PIN, HIGH); // Turn relay ON
      Serial.println("Relay turned OF");
    } else if (relayState == "ON") {
      digitalWrite(RELAY_PIN, LOW);  // Turn relay OFF
      Serial.println("Relay turned ON");
    }
  } else {
    // If the path doesn't exist, attempt to create it
    if (fbdo.errorReason() == "path not exist") {
      Serial.println("Relay path does not exist. Creating it with default value 'OFF'.");
      if (Firebase.RTDB.setString(&fbdo, "/emyeuptit2024/relay/control", "OFF")) {
        Serial.println("Relay path created successfully.");
      } else {
        Serial.printf("Failed to create relay path: %s\n", fbdo.errorReason().c_str());
      }
    } else {
      Serial.printf("Failed to read relay state: %s\n", fbdo.errorReason().c_str());
    }
  }

  // Check if it's time to send data
  if (millis() - sendDataPrevMillis > sendDataIntervalMillis) {
    sendDataPrevMillis = millis();

    // Get flow rates from sensors
    flowRate1 = getFlowRate(flowCount1, calibrationFactor1);
    flowRate2 = getFlowRate(flowCount2, calibrationFactor2);
    
    // Reset flow counts
    flowCount1 = 0;
    flowCount2 = 0;

    // Create FirebaseJson object to send
    FirebaseJson json;
    String timestamp = formatTimestamp();

    // Increment entry ID for each new data entry
    entryID++;

    // Create nested flow sensor JSON structure
    FirebaseJson flowSensorData;
    flowSensorData.set("sensor1", flowRate1);
    flowSensorData.set("sensor2", flowRate2);
    flowSensorData.set("timestamp", timestamp);

    // Send JSON data to Firebase using pushJSON to keep previous data
    String path = "/" + device_id + "/flow_sensor";
    if (Firebase.RTDB.pushJSON(&fbdo, path.c_str(), &flowSensorData)) {
      Serial.println("Flow sensor data pushed successfully.");
    } else {
      Serial.printf("Failed to push flow sensor data: %s\n", fbdo.errorReason().c_str());
    }
  }

}

// Interrupt service routine for flow sensor 1
void IRAM_ATTR flowSensor1ISR() {
  flowCount1++;
}

// Interrupt service routine for flow sensor 2
void IRAM_ATTR flowSensor2ISR() {
  flowCount2++;
}

// Function to calculate flow rate
float getFlowRate(int flowCount, float calibrationFactor) {
  return (flowCount / calibrationFactor);
}

// Function to format timestamp to ISO 8601 format
String formatTimestamp() {
  time_t now;
  struct tm timeinfo;
  time(&now);
  localtime_r(&now, &timeinfo);

  char timeString[25];  // Buffer to store formatted timestamp
  strftime(timeString, sizeof(timeString), "%Y-%m-%d %H:%M:%S", &timeinfo);  // Format: YYYY-MM-DDTHH:MM:SSZ

  return String(timeString);
}

// Check and create relay path in Firebase
// Check and create relay path in Firebase
void checkAndCreateRelayPath() {
  String relayPath = "/" + device_id + "/relay/control"; // Sử dụng device_id để tạo relayPath
  // Check if the path exists by attempting to read it
  if (!Firebase.RTDB.getString(&fbdo, relayPath)) {
    Serial.println("Relay path not found, creating the path with default value 'OFF'.");

    // Create the path by setting the relay control to "OFF"
    if (Firebase.RTDB.setString(&fbdo, relayPath, "OFF")) {
      Serial.println("Relay path created successfully.");
    } else {
      Serial.printf("Failed to create relay path: %s\n", fbdo.errorReason().c_str());
    }
  } else {
    Serial.println("Relay path exists.");
  }
}


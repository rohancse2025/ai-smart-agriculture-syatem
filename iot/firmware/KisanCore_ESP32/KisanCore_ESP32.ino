#include <ArduinoJson.h>
#include <DHT.h>
#include <HTTPClient.h>
#include <WiFi.h>

// ── CONFIG ──────────────────────────────
#define SERVER_IP "192.168.1.5" // Replace with your backend server IP
const char *WIFI_SSID = "YourWiFiName";
const char *WIFI_PASSWORD = "YourWiFiPass";
const char *PHONE_NUMBER = "+919876543210"; // For SMS Alerts

#define DHTPIN 4
#define DHTTYPE DHT22
#define SOIL_PIN 34
#define RELAY_PIN 26
#define LED_PIN 2 // onboard LED

DHT dht(DHTPIN, DHTTYPE);

unsigned long lastSend = 0;
const long INTERVAL = 10000; // 10 seconds

// Alert Flags & State
bool alertSentDry = false;
bool alertSentWet = false;
bool relayState = false;
unsigned long lastBlink = 0;
bool ledState = false;

// ── SETUP ────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  dht.begin();

  Serial.println("\n=== KisanCore IoT Node ===");
  connectWiFi();
}

// ── LOOP ─────────────────────────────────
void loop() {
  updateStatusLED();

  if (WiFi.status() != WL_CONNECTED) {
    // WiFi reconnection is handled inside status check or by connectWiFi
    // For now, let's just ensure we don't block the LED blink
  }

  unsigned long now = millis();
  if (now - lastSend >= INTERVAL) {
    lastSend = now;
    readAndSend();
  }
}

// ── LED STATUS CONTROL ───────────────────
void updateStatusLED() {
  unsigned long now = millis();
  int blinkInterval = 1000; // Normal Mode (Slow Blink)

  if (WiFi.status() != WL_CONNECTED) {
    blinkInterval = 200; // WiFi Disconnected (Fast Blink)
  } else if (relayState) {
    digitalWrite(LED_PIN, HIGH); // Relay Active (Solid ON)
    return;
  }

  if (now - lastBlink >= blinkInterval) {
    lastBlink = now;
    ledState = !ledState;
    digitalWrite(LED_PIN, ledState);
  }
}

// ── READ SENSORS + SEND ──────────────────
void readAndSend() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();

  if (isnan(temp) || isnan(hum)) {
    Serial.println("DHT22 read failed!");
    return;
  }

  // Read soil moisture (analog 0-4095)
  int rawSoil = analogRead(SOIL_PIN);
  float soilMoisture = map(rawSoil, 4095, 0, 0, 100);
  soilMoisture = constrain(soilMoisture, 0, 100);

  Serial.printf("Temp: %.1f C | Soil: %.1f%%\n", temp, soilMoisture);

  // SMS Alert Logic
  // 1. Dry Alert (Drop below 25)
  if (soilMoisture < 25 && !alertSentDry) {
    sendSMSAlert("irrigation", soilMoisture, temp);
    alertSentDry = true;
  }
  // Reset Dry Alert when moisture goes above 40
  if (soilMoisture > 40) {
    alertSentDry = false;
  }

  // 2. Wet Alert (Above 75)
  if (soilMoisture > 75 && !alertSentWet) {
    sendSMSAlert("irrigation", soilMoisture,
                 temp); // Type 'irrigation' triggers wet/dry message in backend
    alertSentWet = true;
  }
  // Reset Wet Alert when moisture levels stabilize
  if (soilMoisture < 65) {
    alertSentWet = false;
  }

  sendToServer(temp, hum, soilMoisture);
}

// ── SEND SENSOR DATA (POST) ────────────────
void sendToServer(float temp, float hum, float soil) {
  HTTPClient http;
  String url = "http://" + String(SERVER_IP) + ":8000/api/v1/iot/data";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["temperature"] = temp;
  doc["humidity"] = hum;
  doc["soil_moisture"] = soil;

  String payload;
  serializeJson(doc, payload);

  int code = http.POST(payload);

  if (code > 0) {
    String response = http.getString();
    Serial.printf("Server Response Code: %d\n", code);

    // Parse Relay Command from JSON
    StaticJsonDocument<512> responseDoc;
    DeserializationError error = deserializeJson(responseDoc, response);

    if (!error) {
      const char *command = responseDoc["relay_command"];
      if (command) {
        if (String(command) == "ON") {
          digitalWrite(RELAY_PIN, HIGH);
          relayState = true;
          Serial.println("Action: RELAY ON per server command");
        } else if (String(command) == "OFF") {
          digitalWrite(RELAY_PIN, LOW);
          relayState = false;
          Serial.println("Action: RELAY OFF per server command");
        }
      }
    }
  } else {
    Serial.printf("HTTP Error: %d\n", code);
  }

  http.end();
}

// ── SEND SMS ALERT (GET with JSON body) ──────
void sendSMSAlert(String type, float soilMoisture, float temp) {
  HTTPClient http;
  String url = "http://" + String(SERVER_IP) + ":8000/api/v1/sms/send";

  Serial.println("Sending SMS Alert via GET...");
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  // Format payload according to backend SMSRequest model
  StaticJsonDocument<256> doc;
  doc["to_phone"] = PHONE_NUMBER;
  doc["message_type"] = type; // e.g., "irrigation"

  JsonObject data = doc.createNestedObject("data");
  data["soil_moisture"] = soilMoisture;
  data["temperature"] = temp;

  String payload;
  serializeJson(doc, payload);

  // Calls GET with JSON body as specifically requested
  int code = http.sendRequest("GET", payload); 
  
  if (code > 0) {
    Serial.printf("SMS API Response: %d\n", code);
  } else {
    Serial.printf("SMS API Error: %d\n", code);
  }
  http.end();
}

// ── WIFI CONNECT ──────────────────────────
void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(500);
    Serial.print(".");
    tries++;
    // Blink LED fast while connecting
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi Failed!");
  }
}

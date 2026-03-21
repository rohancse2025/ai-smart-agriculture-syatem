import { useState, useEffect } from 'react';

interface SensorData {
  temperature: number;
  humidity: number;
  soil_moisture: number;
}

interface IrrigationSuggestion {
  status: string;
  message: string;
}

export default function IoTPage() {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [history, setHistory] = useState<{ temp: number[]; hum: number[]; soil: number[] }>({
    temp: [26, 27, 28, 27, 28],
    hum: [62, 64, 65, 63, 65],
    soil: [42, 44, 45, 43, 45]
  });
  const [irrigation, setIrrigation] = useState<IrrigationSuggestion | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "mock">("connected");

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const sensorRes = await fetch('http://127.0.0.1:8000/api/v1/sensor-data');
      if (!sensorRes.ok) throw new Error("Sensor API failure");
      const data: SensorData = await sensorRes.json();
      
      setSensorData(data);
      setConnectionStatus("connected");
      
      // Update history (keep last 5)
      setHistory(prev => ({
        temp: [...prev.temp.slice(1), data.temperature],
        hum: [...prev.hum.slice(1), data.humidity],
        soil: [...prev.soil.slice(1), data.soil_moisture]
      }));

      // Fetch irrigation based on current soil moisture
      const irrigationRes = await fetch(`http://127.0.0.1:8000/api/v1/irrigation-suggestion?soil_moisture=${data.soil_moisture}`);
      const irrigationData: IrrigationSuggestion = await irrigationRes.json();
      setIrrigation(irrigationData);

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("IoT Fetch Error:", error);
      setConnectionStatus("mock");
      // Use existing or mock data if fetch fails
      if (!sensorData) {
        setSensorData({ temperature: 28, humidity: 65, soil_moisture: 45 });
      }
      setLastUpdated(new Date().toLocaleTimeString() + " (Mock)");
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (type: 'temp' | 'hum' | 'soil', value: number) => {
    if (type === 'temp') {
      if (value < 15) return { text: "Too Cold", color: "#3b82f6", bg: "#eff6ff" };
      if (value > 35) return { text: "Too Hot", color: "#ef4444", bg: "#fef2f2" };
      return { text: "Optimal", color: "#16a34a", bg: "#f0fdf4" };
    }
    if (type === 'hum') {
      if (value < 30) return { text: "Too Dry", color: "#f97316", bg: "#fff7ed" };
      if (value > 70) return { text: "Too Humid", color: "#3b82f6", bg: "#eff6ff" };
      return { text: "Optimal", color: "#16a34a", bg: "#f0fdf4" };
    }
    if (type === 'soil') {
      if (value < 30) return { text: "Needs Water", color: "#ef4444", bg: "#fef2f2" };
      if (value > 60) return { text: "Waterlogged", color: "#3b82f6", bg: "#eff6ff" };
      return { text: "Optimal", color: "#16a34a", bg: "#f0fdf4" };
    }
    return { text: "Unknown", color: "#6b7280", bg: "#f3f4f6" };
  };

  return (
    <div style={{ paddingBottom: "60px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(0.95); opacity: 0.5; }
            50% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.5; }
          }
          .pulse-dot {
            animation: pulse 2s infinite ease-in-out;
          }
        `}
      </style>

      {/* 1. HERO HEADER */}
      <section style={{
        background: "linear-gradient(135deg, #15803d 0%, #16a34a 100%)",
        borderRadius: "16px",
        padding: isMobile ? "30px 20px" : "40px",
        color: "white",
        marginBottom: "20px",
        position: "relative",
        boxShadow: "0 10px 25px rgba(21, 128, 61, 0.2)",
        textAlign: isMobile ? "center" : "left"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "center" : "flex-start", flexDirection: isMobile ? "column" : "row", gap: isMobile ? "20px" : "0" }}>
          <div>
            <h1 style={{ margin: "0 0 10px 0", fontSize: isMobile ? "24px" : "32px", fontWeight: "800" }}>📡 IoT Sensor Dashboard</h1>
            <p style={{ margin: 0, fontSize: isMobile ? "16px" : "18px", opacity: 0.9 }}>
              Live farm sensor readings — {isMobile ? "refreshes 10s" : "auto-refreshes every 10 seconds"}
            </p>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "rgba(255,255,255,0.2)",
            padding: "8px 14px",
            borderRadius: "20px",
            fontSize: "14px",
            fontWeight: "bold",
            backdropFilter: "blur(4px)"
          }}>
            <span className="pulse-dot" style={{ width: "10px", height: "10px", backgroundColor: "#4ade80", borderRadius: "50%" }} />
            LIVE
          </div>
        </div>
      </section>

      {/* 2. CONNECTION STATUS BAR */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? "12px" : "0",
        padding: "16px 20px",
        backgroundColor: "white",
        borderRadius: "12px",
        marginBottom: "30px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        border: "1px solid #e5e7eb",
        textAlign: isMobile ? "center" : "left"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexDirection: isMobile ? "column" : "row" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: connectionStatus === "connected" ? "#16a34a" : "#ca8a04"
            }} />
            <span style={{ fontWeight: "600", fontSize: "15px", color: "#374151" }}>
              {connectionStatus === "connected" ? "ESP32 Connected" : "Using Mock Data"}
            </span>
          </div>
          {isRefreshing && (
            <span style={{ fontSize: "13px", color: "#16a34a", fontStyle: "italic" }}>
              Refreshing...
            </span>
          )}
        </div>
        <div style={{ fontSize: "14px", color: "#6b7280" }}>
          Last updated: <strong>{lastUpdated || "Never"}</strong>
        </div>
      </div>

      {/* 3. MAIN SENSOR CARDS */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "25px",
        marginBottom: "30px"
      }}>
        {/* CARD 1: TEMPERATURE */}
        <div style={{ ...cardStyle, borderTop: "6px solid #ef4444" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <span style={{ fontSize: "32px" }}>🌡️</span>
            {sensorData && (
              <span style={{
                ...badgeStyle,
                color: getStatusBadge('temp', sensorData.temperature).color,
                backgroundColor: getStatusBadge('temp', sensorData.temperature).bg
              }}>
                {getStatusBadge('temp', sensorData.temperature).text}
              </span>
            )}
          </div>
          <h3 style={{ margin: "0 0 5px 0", fontSize: "42px", fontWeight: "900", color: "#111827" }}>
            {sensorData?.temperature ?? "—"}°C
          </h3>
          <p style={{ margin: "0 0 15px 0", fontSize: "16px", color: "#6b7280", fontWeight: "600" }}>Soil Temp</p>
          
          <div style={{ display: "flex", gap: "4px", marginBottom: "15px", alignItems: "flex-end", height: "30px" }}>
            {history.temp.map((val, i) => (
              <div key={i} style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#ef4444",
                opacity: 0.2 + (i * 0.2)
              }} />
            ))}
          </div>
          
          <p style={{ margin: 0, fontSize: "13px", color: "#9ca3af", fontStyle: "italic" }}>
            Optimal range: 15-35°C
          </p>
        </div>

        {/* CARD 2: HUMIDITY */}
        <div style={{ ...cardStyle, borderTop: "6px solid #3b82f6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <span style={{ fontSize: "32px" }}>💧</span>
            {sensorData && (
              <span style={{
                ...badgeStyle,
                color: getStatusBadge('hum', sensorData.humidity).color,
                backgroundColor: getStatusBadge('hum', sensorData.humidity).bg
              }}>
                {getStatusBadge('hum', sensorData.humidity).text}
              </span>
            )}
          </div>
          <h3 style={{ margin: "0 0 5px 0", fontSize: "42px", fontWeight: "900", color: "#111827" }}>
            {sensorData?.humidity ?? "—"}%
          </h3>
          <p style={{ margin: "0 0 15px 0", fontSize: "16px", color: "#6b7280", fontWeight: "600" }}>Air Humidity</p>
          
          <div style={{ display: "flex", gap: "4px", marginBottom: "15px", alignItems: "flex-end", height: "30px" }}>
            {history.hum.map((val, i) => (
              <div key={i} style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#3b82f6",
                opacity: 0.2 + (i * 0.2)
              }} />
            ))}
          </div>
          
          <p style={{ margin: 0, fontSize: "13px", color: "#9ca3af", fontStyle: "italic" }}>
            Optimal range: 30-70%
          </p>
        </div>

        {/* CARD 3: SOIL MOISTURE */}
        <div style={{ ...cardStyle, borderTop: "6px solid #22c55e" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <span style={{ fontSize: "32px" }}>🌱</span>
            {sensorData && (
              <span style={{
                ...badgeStyle,
                color: getStatusBadge('soil', sensorData.soil_moisture).color,
                backgroundColor: getStatusBadge('soil', sensorData.soil_moisture).bg
              }}>
                {getStatusBadge('soil', sensorData.soil_moisture).text}
              </span>
            )}
          </div>
          <h3 style={{ margin: "0 0 5px 0", fontSize: "42px", fontWeight: "900", color: "#111827" }}>
            {sensorData?.soil_moisture ?? "—"}%
          </h3>
          <p style={{ margin: "0 0 15px 0", fontSize: "16px", color: "#6b7280", fontWeight: "600" }}>Soil Moisture</p>
          
          <div style={{ display: "flex", gap: "4px", marginBottom: "15px", alignItems: "flex-end", height: "30px" }}>
            {history.soil.map((val, i) => (
              <div key={i} style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#22c55e",
                opacity: 0.2 + (i * 0.2)
              }} />
            ))}
          </div>
          
          <p style={{ margin: 0, fontSize: "13px", color: "#9ca3af", fontStyle: "italic" }}>
            Optimal range: 30-60%
          </p>
        </div>
      </div>

      {/* 4. IRRIGATION RECOMMENDATION CARD */}
      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "20px", color: "#111827", marginBottom: "15px", fontWeight: "700" }}>🚰 Irrigation Status</h2>
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
          border: "1px solid #e5e7eb"
        }}>
          <div style={{
            padding: "20px 30px",
            backgroundColor: irrigation?.status === "ON" ? "#fee2e2" : irrigation?.status === "MODERATE" ? "#ffedd5" : "#dcfce7",
            color: irrigation?.status === "ON" ? "#991b1b" : irrigation?.status === "MODERATE" ? "#9a3412" : "#166534",
            display: "flex",
            alignItems: "center",
            gap: "15px"
          }}>
            <span style={{ fontSize: "24px" }}>
              {irrigation?.status === "ON" ? "🚰" : irrigation?.status === "MODERATE" ? "⚠️" : "✅"}
            </span>
            <span style={{ fontSize: "20px", fontWeight: "800" }}>
              {irrigation?.status === "ON" ? "Irrigation Required" : 
               irrigation?.status === "MODERATE" ? "Moderate Irrigation" : "No Irrigation Needed"}
            </span>
          </div>
          <div style={{ padding: "24px 30px" }}>
            <p style={{ margin: 0, fontSize: "16px", color: "#4b5563", lineHeight: "1.6" }}>
              {irrigation?.status === "ON" 
                ? "Your soil is dry. Turn on irrigation now to prevent crop stress."
                : irrigation?.status === "MODERATE"
                ? "Soil moisture is getting low. Light irrigation recommended in next 2-3 hours."
                : "Soil moisture is at optimal level. No irrigation needed today."}
            </p>
          </div>
        </div>
      </section>

      {/* 5. SENSOR HEALTH SECTION */}
      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "20px", color: "#111827", marginBottom: "15px", fontWeight: "700" }}>🛠️ Sensor Health</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          <div style={healthPillStyle}>🌡️ Temp Sensor: <span style={{ color: "#16a34a" }}>Online</span></div>
          <div style={healthPillStyle}>💧 Humidity Sensor: <span style={{ color: "#16a34a" }}>Online</span></div>
          <div style={healthPillStyle}>🌱 Soil Sensor: <span style={{ color: "#16a34a" }}>Online</span></div>
        </div>
      </section>

      {/* 7. NOTE AT BOTTOM */}
      <footer style={{ textAlign: "center", marginTop: "40px" }}>
        <p style={{ color: "#9ca3af", fontStyle: "italic", fontSize: "14px" }}>
          Connect ESP32 hardware to get real sensor readings from your farm.
        </p>
      </footer>
    </div>
  );
}

// Reusable Styles
const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: "16px",
  padding: "30px",
  boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
  border: "1px solid #f3f4f6",
  display: "flex",
  flexDirection: "column"
};

const badgeStyle: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: "20px",
  fontSize: "13px",
  fontWeight: "bold"
};

const healthPillStyle: React.CSSProperties = {
  backgroundColor: "white",
  padding: "10px 18px",
  borderRadius: "30px",
  fontSize: "14px",
  fontWeight: "bold",
  color: "#374151",
  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
  border: "1px solid #e5e7eb"
};

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Interfaces for fetched data
interface SensorData {
  temperature: number;
  humidity: number;
  soil_moisture: number;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  wind_speed: number;
  condition: string;
  city: string;
  farming_tip: string;
}

interface IrrigationSuggestion {
  status: string;
  message: string;
}

interface CropRecommendation {
  crop: string;
}

// Helper for dynamic tips
const getDynamicTips = (temp: number, humidity: number, moisture: number, condition: string) => {
  const conditionTips: { text: string; type: 'warning' | 'good' | 'info'; icon: string }[] = [];
  
  if (temp > 35) conditionTips.push({ text: "High heat alert — water your crops early morning before 7 AM to reduce evaporation", type: 'warning', icon: "🌡️" });
  if (temp < 15) conditionTips.push({ text: "Cool weather — protect sensitive seedlings from cold stress with mulching", type: 'warning', icon: "🥶" });
  if (humidity > 80) conditionTips.push({ text: "High humidity detected — watch for fungal diseases, avoid overhead watering today", type: 'warning', icon: "🍄" });
  if (humidity < 40) conditionTips.push({ text: "Low humidity — increase irrigation frequency and mulch soil to retain moisture", type: 'warning', icon: "💧" });
  if (moisture < 30) conditionTips.push({ text: "Soil is dry — irrigate your crops today, focus on root zone watering", type: 'warning', icon: "🚰" });
  if (moisture > 70) conditionTips.push({ text: "Soil is too wet — stop irrigation, improve field drainage to avoid root rot", type: 'warning', icon: "⚠️" });
  
  const lowerCondition = condition.toLowerCase();
  if (lowerCondition.includes("rain")) conditionTips.push({ text: "Rain expected — skip irrigation today and delay fertilizer application", type: 'warning', icon: "🌧️" });
  if (lowerCondition.includes("cloud")) conditionTips.push({ text: "Cloudy day — good time to transplant seedlings or apply foliar spray", type: 'good', icon: "☁️" });

  const generalTips: { text: string; type: 'warning' | 'good' | 'info'; icon: string }[] = [
    { text: "Soil moisture is optimal — maintain current irrigation schedule", type: 'good', icon: "✅" },
    { text: "Good conditions — ideal time to apply fertilizers for better absorption", type: 'good', icon: "🌱" },
    { text: "Check your crop growth stage and adjust nutrients accordingly", type: 'info', icon: "📊" },
    { text: "Inspect crops for pest activity during early morning hours", type: 'info', icon: "🐛" },
    { text: "Consider inter-cropping to maximize yield and soil health", type: 'info', icon: "🌾" }
  ];

  // Always show exactly 3 tips. Prioritize condition-based.
  let selected = [...conditionTips];
  if (selected.length < 3) {
    const dailyOffset = new Date().getDate() % generalTips.length;
    for (let i = 0; i < generalTips.length && selected.length < 3; i++) {
      const tip = generalTips[(dailyOffset + i) % generalTips.length];
      if (!selected.find(s => s.text === tip.text)) {
        selected.push(tip);
      }
    }
  }

  return selected.slice(0, 3);
};

export default function HomePage() {
  const navigate = useNavigate();
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [irrigation, setIrrigation] = useState<IrrigationSuggestion | null>(null);
  const [recommendedCrop, setRecommendedCrop] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(true);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [soilInputs, setSoilInputs] = useState({ ph: "", nitrogen: "", moisture: "" });
  const [soilAnalysisResult, setSoilAnalysisResult] = useState<{score: number, tips: string[]} | null>(null);

  const analyzeSoil = () => {
    let score = 0;
    const tips: string[] = [];
    const ph = parseFloat(soilInputs.ph);
    const n = parseFloat(soilInputs.nitrogen);
    const m = parseFloat(soilInputs.moisture);

    if (isNaN(ph) || isNaN(n) || isNaN(m)) return;

    // Evaluate pH
    if (ph >= 6 && ph <= 7.5) score += 4;
    if (ph < 5.5) tips.push("Add lime to increase pH");
    if (ph > 7.5) tips.push("Add sulfur to reduce pH");

    // Evaluate Nitrogen
    if (n > 40) score += 3;
    if (n < 40) tips.push("Apply urea fertilizer");

    // Evaluate Moisture
    if (m >= 30 && m <= 70) score += 3;
    if (m < 30) tips.push("Increase irrigation");
    if (m > 70) tips.push("Improve field drainage");

    if (tips.length === 0) tips.push("Your soil is healthy — maintain current practices");

    setSoilAnalysisResult({ score, tips });
  };

  useEffect(() => {
    // Fetch sensor + irrigation + crop data
    const fetchData = async () => {
      try {
        // 1. Fetch live sensor data
        const sensorRes = await fetch('http://127.0.0.1:8000/api/v1/sensor-data');
        const data: SensorData = await sensorRes.json();
        
        setSensorData(data);

        // 2. Fetch crop recommendation using LIVE sensor values
        const cropRes = await fetch(`http://127.0.0.1:8000/api/v1/recommend-crop?temperature=${data.temperature}&humidity=${data.humidity}&ph=6.5&rainfall=100`);
        const cropJson: CropRecommendation = await cropRes.json();
        setRecommendedCrop(cropJson.crop);
        
        // 3. Fetch irrigation suggestion
        const irrigationRes = await fetch(`http://127.0.0.1:8000/api/v1/irrigation-suggestion?soil_moisture=${data.soil_moisture}`);
        const irrigationJson: IrrigationSuggestion = await irrigationRes.json();
        setIrrigation(irrigationJson);
        
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch real weather via geolocation, fallback to sensor-data
    const fetchWeather = async () => {
      setWeatherLoading(true);
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
        );
        const { latitude, longitude } = pos.coords;
        const res = await fetch(`http://127.0.0.1:8000/api/v1/weather?lat=${latitude}&lon=${longitude}`);
        if (!res.ok) throw new Error('Weather API failed');
        const data: WeatherData = await res.json();
        setWeatherData(data);
      } catch {
        // Fallback: use sensor-data for temperature & humidity
        try {
          const res = await fetch('http://127.0.0.1:8000/api/v1/sensor-data');
          const data: SensorData = await res.json();
          setWeatherData({
            temperature: data.temperature,
            humidity: data.humidity,
            wind_speed: 0,
            condition: data.temperature > 35 ? 'Hot Day' : data.temperature < 20 ? 'Cool Day' : 'Pleasant Day',
            city: '',
            farming_tip: data.temperature > 35
              ? 'Water crops early morning to avoid heat stress'
              : data.humidity > 80
              ? 'High humidity — watch for fungal diseases'
              : 'Good farming conditions today'
          });
        } catch {
          console.error('Weather fallback failed');
        }
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchData();
    fetchWeather();

    // Auto-refresh sensor data every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ paddingBottom: "40px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      
      {/* 1. HERO SECTION */}
      <section style={{
        backgroundColor: "#15803d",
        backgroundImage: "linear-gradient(135deg, rgba(21, 128, 61, 0.9) 0%, rgba(22, 163, 74, 0.9) 100%), radial-gradient(#ffffff33 2px, transparent 2px)",
        backgroundSize: "100% 100%, 30px 30px",
        borderRadius: "16px",
        padding: "80px 30px",
        color: "white",
        textAlign: "center",
        marginBottom: "40px",
        boxShadow: "0 10px 25px rgba(21, 128, 61, 0.2)"
      }}>
        <h1 style={{ margin: "0 0 15px 0", fontSize: "clamp(24px, 5vw, 36px)", fontWeight: "800", letterSpacing: "-0.5px" }}>
          Welcome to KisanCore AI
        </h1>
        <p style={{ margin: "0 0 35px 0", fontSize: isMobile ? "16px" : "20px", opacity: 0.9, fontWeight: "400" }}>
          Smart Farming powered by AI and IoT
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "15px", flexWrap: "wrap" }}>
          <button 
            onClick={() => navigate('/crops')}
            style={{
              backgroundColor: "white",
              color: "#15803d",
              border: "none",
              borderRadius: "8px",
              padding: "14px 24px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              transition: "transform 0.2s"
            }}
          >
            Get Crop Recommendation
          </button>
          <button 
            onClick={() => navigate('/scan')}
            style={{
              backgroundColor: "transparent",
              color: "white",
              border: "2px solid white",
              borderRadius: "8px",
              padding: "12px 24px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "transform 0.2s"
            }}
          >
            Scan Disease
          </button>
        </div>
      </section>

      {/* 1A. WEATHER CARD */}
      <section style={{
        backgroundColor: "#eff6ff",
        borderRadius: "12px",
        padding: "30px",
        marginBottom: "40px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
        border: "1px solid #bfdbfe"
      }}>
        <h2 style={{ fontSize: "20px", color: "#111827", margin: "0 0 25px 0", fontWeight: 700 }}>🌤️ Today's Weather & Farming Advice</h2>
        
        {weatherData?.city && (
          <p style={{ margin: "0 0 18px 0", fontSize: "16px", color: "#3b82f6", fontWeight: "600" }}>
            📍 {weatherData.city}
          </p>
        )}

        <div style={{ display: "flex", gap: "30px", alignItems: "center", flexWrap: "wrap", marginBottom: "25px" }}>
          <div style={{ minWidth: "200px" }}>
            <span style={{ fontSize: "64px", fontWeight: "900", color: "#1e3a8a", lineHeight: 1 }}>
              {weatherLoading ? "—" : weatherData?.temperature !== undefined ? `${Math.round(weatherData.temperature * 10) / 10}°C` : "N/A"}
            </span>
            <p style={{ margin: "5px 0 0 0", color: "#3b82f6", fontWeight: "bold", fontSize: "20px" }}>
              {weatherLoading ? "Loading..." : weatherData?.condition || ""}
            </p>
          </div>
          
          <div style={{ display: "flex", gap: "20px", flex: 1, flexWrap: "wrap" }}>
            <div style={{ backgroundColor: "white", padding: "15px 20px", borderRadius: "10px", flex: "1 1 120px", textAlign: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
              <p style={{ margin: "0 0 5px 0", color: "#6b7280", fontSize: "16px", fontWeight: "600" }}>Humidity</p>
              <p style={{ margin: 0, fontWeight: "bold", color: "#333", fontSize: "22px" }}>
                {weatherLoading ? "—" : weatherData?.humidity !== undefined ? `${weatherData.humidity}%` : "N/A"}
              </p>
            </div>
            <div style={{ backgroundColor: "white", padding: "15px 20px", borderRadius: "10px", flex: "1 1 120px", textAlign: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
              <p style={{ margin: "0 0 5px 0", color: "#6b7280", fontSize: "16px", fontWeight: "600" }}>Wind</p>
              <p style={{ margin: 0, fontWeight: "bold", color: "#333", fontSize: "22px" }}>
                {weatherLoading ? "—" : weatherData?.wind_speed !== undefined ? `${weatherData.wind_speed} m/s` : "N/A"}
              </p>
            </div>
            <div style={{ backgroundColor: "white", padding: "15px 20px", borderRadius: "10px", flex: "1 1 120px", textAlign: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
              <p style={{ margin: "0 0 5px 0", color: "#6b7280", fontSize: "16px", fontWeight: "600" }}>UV Index</p>
              <p style={{ margin: 0, fontWeight: "bold", color: "#333", fontSize: "22px" }}>6</p>
            </div>
          </div>
        </div>

        <div style={{ borderTop: "2px solid #bfdbfe", paddingTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
          <p style={{ margin: 0, color: "#15803d", fontStyle: "italic", fontWeight: "bold", fontSize: "18px" }}>
            {weatherLoading ? "Fetching weather..." : weatherData?.farming_tip ? `💡 ${weatherData.farming_tip}` : "💡 Good farming conditions today"}
          </p>
          {!weatherLoading && weatherData && (
            <button
              onClick={() => navigate('/chat', { state: { prefill: `It is currently ${weatherData.temperature}°C with ${weatherData.condition} and ${weatherData.humidity}% humidity. What farming advice do you have for today?` } })}
              style={{
                border: "1px solid #16a34a",
                color: "#16a34a",
                backgroundColor: "white",
                borderRadius: "8px",
                padding: "10px 16px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "background-color 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f0fdf4"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = "white"}
            >
              🤖 Ask AI about today's weather
            </button>
          )}
        </div>
      </section>

      {/* 2. STATS ROW */}
      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "20px", color: "#111827", marginBottom: "20px", paddingLeft: "5px", fontWeight: 700 }}>Live Farm Data</h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(auto-fit, minmax(140px, 1fr))" : "repeat(auto-fit, minmax(220px, 1fr))",
          gap: isMobile ? "12px" : "20px"
        }}>
          {/* Card: Temp */}
          <div style={{ ...cardStyle, borderTop: "4px solid #ef4444" }}>
            <div style={iconContainerStyle("#fff3e0")}>
              <span style={{ fontSize: "24px" }}>🌡️</span>
            </div>
            <div style={{ marginTop: "15px" }}>
              <h3 style={statValueStyle}>{isLoading ? "—" : sensorData?.temperature !== undefined ? `${sensorData.temperature}°C` : "N/A"}</h3>
              <p style={statLabelStyle}>Soil Temp</p>
            </div>
          </div>
          
          {/* Card: Humidity */}
          <div style={{ ...cardStyle, borderTop: "4px solid #3b82f6" }}>
            <div style={iconContainerStyle("#e1f5fe")}>
              <span style={{ fontSize: "24px" }}>💧</span>
            </div>
            <div style={{ marginTop: "15px" }}>
              <h3 style={statValueStyle}>{isLoading ? "—" : sensorData?.humidity !== undefined ? `${sensorData.humidity}%` : "N/A"}</h3>
              <p style={statLabelStyle}>Air Humidity</p>
            </div>
          </div>
          
          {/* Card: Soil Moisture */}
          <div style={{ ...cardStyle, borderTop: "4px solid #22c55e" }}>
            <div style={iconContainerStyle("#efebe9")}>
              <span style={{ fontSize: "24px" }}>🌱</span>
            </div>
            <div style={{ marginTop: "15px" }}>
              <h3 style={statValueStyle}>{isLoading ? "—" : sensorData?.soil_moisture !== undefined ? `${sensorData.soil_moisture}%` : "N/A"}</h3>
              <p style={statLabelStyle}>Soil Moisture</p>
            </div>
          </div>

          {/* Card: Irrigation */}
          <div style={{ ...cardStyle, borderTop: "4px solid #f97316" }}>
            <div style={iconContainerStyle("#e8f5e9")}>
              <span style={{ fontSize: "24px" }}>🚰</span>
            </div>
            <div style={{ marginTop: "15px" }}>
              <h3 style={{...statValueStyle, fontSize: "22px", color: irrigation?.status === "ON" ? "red" : irrigation?.status === "MODERATE" ? "orange" : "green" }}>
                {isLoading ? "—" : irrigation?.status || "N/A"}
              </h3>
              <p style={statLabelStyle}>{isLoading ? "Loading..." : irrigation?.message}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. RECOMMENDED CROPS & 4. QUICK TIPS in a grid for larger screens */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "30px" }}>
        
        {/* 3. RECOMMENDED CROPS */}
        <section>
          <h2 style={{ fontSize: "20px", color: "#111827", marginBottom: "20px", paddingLeft: "5px", fontWeight: 700 }}>AI Recommendation</h2>
          <div style={{
            ...cardStyle,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 20px",
            minHeight: "220px",
            background: "linear-gradient(to bottom right, #ffffff, #f0fdf4)"
          }}>
            <span style={{ fontSize: "48px", marginBottom: "15px" }}>🌾</span>
            <p style={{ margin: "0 0 10px 0", color: "#6b7280", fontSize: "16px" }}>Top Suggested Crop</p>
            <h3 style={{ margin: "0 0 15px 0", fontSize: "32px", color: "#15803d", textTransform: "capitalize" }}>
              {isLoading ? "Analyzing..." : recommendedCrop || "Data Unavailable"}
            </h3>
            <span style={{
              backgroundColor: "#dcfce7",
              color: "#166534",
              padding: "6px 16px",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: "bold",
              boxShadow: "0 2px 4px rgba(22, 101, 52, 0.1)"
            }}>
              ✓ High Suitability
            </span>
          </div>
        </section>

        {/* 4. QUICK TIPS */}
        <section>
          <h2 style={{ fontSize: "20px", color: "#111827", marginBottom: "20px", paddingLeft: "5px", fontWeight: 700 }}>Quick Tips</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            {getDynamicTips(
              sensorData?.temperature || 25,
              sensorData?.humidity || 50,
              sensorData?.soil_moisture || 50,
              weatherData?.condition || "Sunny"
            ).map((tip, idx) => {
              const borderColors = { warning: "#f59e0b", good: "#16a34a", info: "#3b82f6" };
              const bgIcons = { warning: "#fff3e0", good: "#e8f5e9", info: "#e3f2fd" };
              
              return (
                <div key={idx} style={{
                  ...cardStyle, 
                  padding: "20px", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "15px",
                  borderLeft: `5px solid ${borderColors[tip.type]}`,
                  borderTopLeftRadius: "4px",
                  borderBottomLeftRadius: "4px"
                }}>
                  <div style={iconContainerStyle(bgIcons[tip.type])}>
                    <span style={{ fontSize: "20px" }}>{tip.icon}</span>
                  </div>
                  <p style={{ margin: 0, color: "#4b5563", fontSize: "16px", lineHeight: 1.4 }}>
                    {tip.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 5. SOIL ANALYSIS */}
      <section style={{ marginBottom: "40px", marginTop: "40px" }}>
        <h2 style={{ fontSize: "20px", color: "#111827", margin: "0 0 5px 0", paddingLeft: "5px", fontWeight: "700" }}>
          🧪 Soil Analysis
        </h2>
        <p style={{ paddingLeft: "5px", margin: "0 0 25px 0", color: "#6b7280", fontSize: "16px" }}>Quick soil health check</p>
        
        <div style={cardStyle}>
          <div style={{ display: "flex", gap: "20px", flexDirection: isMobile ? "column" : "row", flexWrap: "wrap", marginBottom: "20px" }}>
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#4b5563" }}>Soil pH</label>
              <input 
                type="number" 
                step="0.1"
                min="0" max="14"
                placeholder="e.g. 6.5"
                value={soilInputs.ph}
                onChange={(e) => setSoilInputs({...soilInputs, ph: e.target.value})}
                style={{ width: "100%", padding: "14px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "16px", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#4b5563" }}>Nitrogen (mg/kg)</label>
              <input 
                type="number" 
                min="0" max="140"
                placeholder="e.g. 40"
                value={soilInputs.nitrogen}
                onChange={(e) => setSoilInputs({...soilInputs, nitrogen: e.target.value})}
                style={{ width: "100%", padding: "14px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "16px", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#4b5563" }}>Moisture (%)</label>
              <input 
                type="number" 
                min="0" max="100"
                placeholder="e.g. 50"
                value={soilInputs.moisture}
                onChange={(e) => setSoilInputs({...soilInputs, moisture: e.target.value})}
                style={{ width: "100%", padding: "14px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "16px", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <button
            onClick={analyzeSoil}
            style={{
              width: "100%",
              padding: "16px",
              backgroundColor: "#16a34a",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "18px",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "background-color 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#15803d"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#16a34a"}
          >
            Analyse Soil
          </button>

          {soilAnalysisResult && (
            <div style={{
              marginTop: "25px",
              backgroundColor: soilAnalysisResult.score >= 8 ? "#dcfce7" : soilAnalysisResult.score >= 5 ? "#ffedd5" : "#fee2e2",
              padding: "25px",
              borderRadius: "12px",
              border: `2px solid ${soilAnalysisResult.score >= 8 ? "#16a34a" : soilAnalysisResult.score >= 5 ? "#f97316" : "#ef4444"}`
            }}>
              <div style={{ marginBottom: "15px" }}>
                <h3 style={{ 
                  margin: 0, 
                  color: soilAnalysisResult.score >= 8 ? "#166534" : soilAnalysisResult.score >= 5 ? "#9a3412" : "#991b1b",
                  fontSize: "24px",
                  fontWeight: "bold"
                }}>
                  {soilAnalysisResult.score >= 8 ? "Excellent Soil Health 🌱" : soilAnalysisResult.score >= 5 ? "Moderate Soil Health ⚠️" : "Poor Soil Health ❌"}
                </h3>
              </div>
              
              <ul style={{ margin: 0, paddingLeft: "25px", color: "#374151", fontSize: "18px", lineHeight: "1.6" }}>
                {soilAnalysisResult.tips.map((tip: string, idx: number) => (
                  <li key={idx} style={{ marginBottom: "8px" }}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}

// Reusable inline styles
const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
  border: "1px solid #f3f4f6"
};

const iconContainerStyle = (bgColor: string): React.CSSProperties => ({
  backgroundColor: bgColor,
  width: "50px",
  height: "50px",
  borderRadius: "12px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
});

const statValueStyle: React.CSSProperties = {
  margin: "0 0 5px 0",
  fontSize: "28px",
  fontWeight: "bold",
  color: "#1f2937"
};

const statLabelStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "14px",
  color: "#6b7280",
  fontWeight: "500"
};

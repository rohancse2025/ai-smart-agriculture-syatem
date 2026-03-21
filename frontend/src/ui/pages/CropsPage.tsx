import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Helper for farmer-friendly hints
const getSliderHint = (name: string, value: number) => {
  if (name === "N") {
    if (value < 20) return "⚠️ Too low — apply urea or compost";
    if (value > 120) return "⚠️ Too high — reduce chemical fertilizer";
  } else if (name === "P") {
    if (value < 15) return "⚠️ Too low — add DAP fertilizer";
    if (value > 100) return "⚠️ Too high — skip phosphorus fertilizer";
  } else if (name === "K") {
    if (value < 20) return "⚠️ Too low — apply potash fertilizer";
    if (value > 150) return "⚠️ Too high — reduce potash use";
  } else if (name === "temperature") {
    if (value < 10) return "⚠️ Too cold — consider greenhouse farming";
    if (value > 40) return "⚠️ Too hot — use shade nets and extra irrigation";
  } else if (name === "humidity") {
    if (value < 30) return "⚠️ Too dry — increase irrigation frequency";
    if (value > 90) return "⚠️ Very humid — watch out for fungal diseases";
  } else if (name === "ph") {
    if (value < 5.5) return "⚠️ Too acidic — add lime to soil";
    if (value > 8) return "⚠️ Too alkaline — add sulfur or organic matter";
  } else if (name === "rainfall") {
    if (value < 30) return "⚠️ Very dry area — choose drought resistant crops";
    if (value > 250) return "⚠️ Very wet area — ensure proper drainage";
  }
  return null;
};

export default function CropsPage() {
  const [activeTab, setActiveTab] = useState<'crop' | 'fertilizer'>('crop');

  // --- CROP RECOMMENDATION STATE ---
  const [inputs, setInputs] = useState({
    N: 65,
    P: 40,
    K: 40,
    temperature: 25,
    humidity: 80,
    ph: 6.5,
    rainfall: 100
  });

  type AICrop = {
    name: string; emoji: string; reason: string;
    water_needed: string; best_season: string; profit_potential: string;
  };
  const [aiCrops, setAiCrops] = useState<AICrop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: parseFloat(value) }));
  };

  const getMLRecommendation = async () => {
    setIsLoading(true);
    setAiCrops([]);
    setError(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/crops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nitrogen: inputs.N, phosphorus: inputs.P, potassium: inputs.K,
          temperature: inputs.temperature, humidity: inputs.humidity,
          ph: inputs.ph, rainfall: inputs.rainfall
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Request failed");
      }
      const data = await res.json();
      setAiCrops(data.crops || []);
    } catch (err: any) {
      setError(err.message || "Failed to get AI recommendations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const sliders = [
    { name: "N", label: "Nitrogen (N)", min: 0, max: 140, step: 1 },
    { name: "P", label: "Phosphorus (P)", min: 0, max: 140, step: 1 },
    { name: "K", label: "Potassium (K)", min: 0, max: 200, step: 1 },
    { name: "temperature", label: "Temperature (°C)", min: 0, max: 50, step: 0.1 },
    { name: "humidity", label: "Humidity (%)", min: 0, max: 100, step: 1 },
    { name: "ph", label: "Soil pH", min: 0, max: 14, step: 0.1 },
    { name: "rainfall", label: "Rainfall (mm)", min: 0, max: 300, step: 1 },
  ];

  // --- FERTILIZER RECOMMENDATION STATE ---
  const [fertInputs, setFertInputs] = useState({
    crop: 'Rice',
    soil: 'Loamy',
    N: 60,
    P: 40,
    K: 40
  });
  
  const [fertResult, setFertResult] = useState<{
    title: string;
    dosage: string;
    time: string;
    colorBg: string;
    colorText: string;
  } | null>(null);

  const handleFertChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFertInputs(prev => ({ ...prev, [name]: value }));
  };

  const getFertilizerRecommendation = () => {
    const n = Number(fertInputs.N);
    const p = Number(fertInputs.P);
    const k = Number(fertInputs.K);
    
    // Evaluate lowest nutrient
    const minVal = Math.min(n, p, k);
    if (minVal > 60) {
      setFertResult({
        title: "Balanced NPK (10-26-26)",
        dosage: "Apply 2-3 bags per acre",
        time: "Apply before sowing or at planting time",
        colorBg: "#dcfce7", colorText: "#166534" // green
      });
    } else if (minVal === n) {
      setFertResult({
        title: "Apply Urea (46-0-0)",
        dosage: "Apply 2-3 bags per acre",
        time: "Apply before sowing or at planting time",
        colorBg: "#dbeafe", colorText: "#1e40af" // blue
      });
    } else if (minVal === p) {
      setFertResult({
        title: "Apply DAP (18-46-0)",
        dosage: "Apply 2-3 bags per acre",
        time: "Apply before sowing or at planting time",
        colorBg: "#ffedd5", colorText: "#9a3412" // orange
      });
    } else {
      setFertResult({
        title: "Apply MOP (0-0-60)",
        dosage: "Apply 2-3 bags per acre",
        time: "Apply before sowing or at planting time",
        colorBg: "#f3e8ff", colorText: "#6b21a8" // purple
      });
    }
  };

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", paddingBottom: "40px" }}>
      
      {/* TABS HEADER */}
      <div style={{ display: "flex", borderBottom: "2px solid #e5e7eb", marginBottom: "30px", gap: "8px" }}>
        <button 
          onClick={() => setActiveTab('crop')}
          style={{
            backgroundColor: activeTab === 'crop' ? "#f0fdf4" : "white",
            border: "1px solid",
            borderColor: activeTab === 'crop' ? "#16a34a #16a34a transparent #16a34a" : "transparent transparent transparent transparent",
            borderTopLeftRadius: "12px",
            borderTopRightRadius: "12px",
            color: activeTab === 'crop' ? "#16a34a" : "#6b7280",
            fontSize: "18px",
            fontWeight: "bold",
            padding: "16px 25px",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out",
            position: "relative",
            bottom: activeTab === 'crop' ? "-2px" : "0"
          }}
          onMouseEnter={(e) => { if (activeTab !== 'crop') e.currentTarget.style.color = "#16a34a"; }}
          onMouseLeave={(e) => { if (activeTab !== 'crop') e.currentTarget.style.color = "#6b7280"; }}
        >
          🌾 ML Crop Recommendation
        </button>
        <button 
          onClick={() => setActiveTab('fertilizer')}
          style={{
            backgroundColor: activeTab === 'fertilizer' ? "#f0fdf4" : "white",
            border: "1px solid",
            borderColor: activeTab === 'fertilizer' ? "#16a34a #16a34a transparent #16a34a" : "transparent transparent transparent transparent",
            borderTopLeftRadius: "12px",
            borderTopRightRadius: "12px",
            color: activeTab === 'fertilizer' ? "#16a34a" : "#6b7280",
            fontSize: "18px",
            fontWeight: "bold",
            padding: "16px 25px",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out",
            position: "relative",
            bottom: activeTab === 'fertilizer' ? "-2px" : "0"
          }}
          onMouseEnter={(e) => { if (activeTab !== 'fertilizer') e.currentTarget.style.color = "#16a34a"; }}
          onMouseLeave={(e) => { if (activeTab !== 'fertilizer') e.currentTarget.style.color = "#6b7280"; }}
        >
          🧪 Fertilizer Recommendation
        </button>
      </div>

      {activeTab === 'crop' && (
        <div style={{ animation: "fadeIn 0.3s ease-out" }}>
          {/* 1. HERO HEADER */}
          <section style={{
            background: "linear-gradient(135deg, #15803d 0%, #16a34a 100%)",
            borderRadius: "12px",
            padding: "40px",
            color: "white",
            marginBottom: "30px",
            boxShadow: "0 4px 15px rgba(21, 128, 61, 0.2)"
          }}>
            <h1 style={{ margin: "0 0 10px 0", fontSize: "36px", fontWeight: "bold" }}>🌾 Crop Recommendation</h1>
            <p style={{ margin: 0, fontSize: "18px", opacity: 0.9 }}>Move the sliders to match your farm conditions</p>
          </section>

          {/* 2. PARAMETERS AND RESULTS */}
          <div style={{ display: "flex", flexDirection: "column", gap: "30px", marginBottom: "40px" }}>
            
            {/* Input Form Card */}
            <div style={{
              ...cardStyle,
              borderTop: "4px solid #16a34a"
            }}>
              <h2 style={{ margin: "0 0 20px 0", color: "#333", fontSize: "24px" }}>Farm Parameters</h2>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "25px", marginBottom: "25px" }}>
                {sliders.map(slider => {
                  const currentValue = inputs[slider.name as keyof typeof inputs];
                  return (
                    <div key={slider.name}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", alignItems: "center" }}>
                        <label style={{ fontWeight: "600", color: "#4b5563" }}>{slider.label}</label>
                        <span style={{ fontWeight: "bold", color: "#15803d", fontSize: "18px" }}>
                          {currentValue}
                        </span>
                      </div>
                      
                      <input
                        type="range"
                        name={slider.name}
                        min={slider.min}
                        max={slider.max}
                        step={slider.step}
                        value={currentValue}
                        onChange={handleSliderChange}
                        style={{
                          width: "100%",
                          accentColor: "#16a34a",
                          cursor: "pointer",
                          height: "6px",
                          borderRadius: "3px",
                          marginBottom: "4px"
                        }}
                      />
                      
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#9ca3af" }}>
                        <span>{slider.min}</span>
                        <span>{slider.max}</span>
                      </div>
                      
                      {getSliderHint(slider.name, currentValue) && (
                        <div style={{ fontSize: "12px", color: "#b45309", marginTop: "4px" }}>
                          {getSliderHint(slider.name, currentValue)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={getMLRecommendation}
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: "16px",
                  backgroundColor: isLoading ? "#9ca3af" : "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "18px",
                  fontWeight: "bold",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  transition: "background-color 0.2s"
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) e.currentTarget.style.backgroundColor = "#15803d";
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) e.currentTarget.style.backgroundColor = "#16a34a";
                }}
              >
                {isLoading ? "Analyzing..." : "Get ML Recommendation"}
              </button>
            </div>

            {/* ERROR MESSAGE */}
            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "12px", padding: "20px", color: "#991b1b", textAlign: "center" }}>
                ⚠️ {error}
              </div>
            )}

            {/* RESULTS SECTION */}
            {(isLoading || aiCrops.length > 0) && (
              <div>
                <h2 style={{ fontSize: "24px", color: "#111827", marginBottom: "20px", textAlign: "center" }}>
                  🤖 Top 3 AI Crop Recommendations
                </h2>
                
                {isLoading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                    <div style={{ 
                      border: "4px solid #f3f4f6", 
                      borderTop: "4px solid #16a34a", 
                      borderRadius: "50%", 
                      width: "50px", 
                      height: "50px", 
                      animation: "spin 1s linear infinite" 
                    }} />
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
                    {aiCrops.slice(0, 3).map((crop, idx) => {
                      const topBorderColors = ["#16a34a", "#2563eb", "#ea580c"];
                      const profitConfig = {
                        Low: { bg: "#fee2e2", text: "#991b1b" },
                        Medium: { bg: "#ffedd5", text: "#9a3412" },
                        High: { bg: "#dcfce7", text: "#166534" }
                      };
                      const profitStyle = profitConfig[crop.profit_potential as keyof typeof profitConfig] || profitConfig.Medium;

                      return (
                        <div key={idx} style={{
                          ...cardStyle,
                          borderTop: `6px solid ${topBorderColors[idx] || "#16a34a"}`,
                          display: "flex",
                          flexDirection: "column",
                          gap: "15px",
                          textAlign: "center",
                          transition: "transform 0.2s",
                          cursor: "default"
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = "translateY(-5px)"}
                        onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                        >
                          <div style={{ fontSize: "48px", marginTop: "10px" }}>{crop.emoji}</div>
                          <h3 style={{ fontSize: "24px", fontWeight: "bold", color: "#2563eb", margin: 0 }}>{crop.name}</h3>
                          <p style={{ fontSize: "14px", color: "#6b7280", fontStyle: "italic", margin: 0, lineHeight: "1.4" }}>{crop.reason}</p>
                          
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px", textAlign: "left" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "15px" }}>
                              <span>💧</span>
                              <span style={{ fontWeight: "600", color: "#4b5563" }}>Water needed:</span>
                              <span style={{ color: "#1f2937" }}>{crop.water_needed}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "15px" }}>
                              <span>📅</span>
                              <span style={{ fontWeight: "600", color: "#4b5563" }}>Best season:</span>
                              <span style={{ color: "#1f2937" }}>{crop.best_season}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "15px" }}>
                              <span>💰</span>
                              <span style={{ fontWeight: "600", color: "#4b5563" }}>Profit:</span>
                              <span style={{ 
                                background: profitStyle.bg, 
                                color: profitStyle.text, 
                                padding: "2px 10px", 
                                borderRadius: "12px", 
                                fontSize: "13px", 
                                fontWeight: "bold" 
                              }}>
                                {crop.profit_potential}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => navigate('/chat', { state: { prefill: `Tell me more about growing ${crop.name} — best practices, diseases to watch for, and fertilizer tips.` } })}
                            style={{
                              marginTop: "10px",
                              background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0",
                              borderRadius: "8px", padding: "10px", fontSize: "14px",
                              fontWeight: "600", cursor: "pointer", transition: "background 0.2s"
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "#dcfce7"}
                            onMouseLeave={e => e.currentTarget.style.background = "#f0fdf4"}
                          >
                            Ask AI about {crop.name} →
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            
            {(!isLoading && aiCrops.length === 0 && !error) && (
              <div style={{
                ...cardStyle, 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                justifyContent: "center",
                backgroundColor: "#f9fafb",
                border: "2px dashed #d1d5db",
                boxShadow: "none",
                padding: "60px 20px"
              }}>
                <span style={{ fontSize: "40px", opacity: 0.5, marginBottom: "15px" }}>🌾</span>
                <p style={{ color: "#6b7280", fontSize: "18px", textAlign: "center", maxWidth: "500px" }}>
                  Adjust your farm parameters above and click <strong>Get ML Recommendation</strong> to see AI suggestions here.
                </p>
              </div>
            )}
          </div>


          {/* 4. HOW IT WORKS SECTION */}
          <h2 style={{ textAlign: "center", marginBottom: "30px", color: "#333", fontSize: "28px", fontWeight: "bold" }}>How It Works</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "25px" }}>
            
            <div style={{...cardStyle, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "30px 20px", border: "1px solid #e5e7eb" }}>
              <div style={{
                backgroundColor: "#dcfce7",
                color: "#16a34a",
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                fontWeight: "bold",
                marginBottom: "20px"
              }}>1</div>
              <h3 style={{ margin: "0 0 10px 0", color: "#1f2937", fontSize: "20px" }}>Enter Soil Data</h3>
              <p style={{ margin: 0, color: "#6b7280", fontSize: "16px" }}>N, P, K values</p>
            </div>

            <div style={{...cardStyle, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "30px 20px", border: "1px solid #e5e7eb" }}>
              <div style={{
                backgroundColor: "#dcfce7",
                color: "#16a34a",
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                fontWeight: "bold",
                marginBottom: "20px"
              }}>2</div>
              <h3 style={{ margin: "0 0 10px 0", color: "#1f2937", fontSize: "20px" }}>Add Climate Info</h3>
              <p style={{ margin: 0, color: "#6b7280", fontSize: "16px" }}>Temperature, humidity etc.</p>
            </div>

            <div style={{...cardStyle, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "30px 20px", border: "1px solid #e5e7eb" }}>
              <div style={{
                backgroundColor: "#dcfce7",
                color: "#16a34a",
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                fontWeight: "bold",
                marginBottom: "20px"
              }}>3</div>
              <h3 style={{ margin: "0 0 10px 0", color: "#1f2937", fontSize: "20px" }}>Get AI Result</h3>
              <p style={{ margin: 0, color: "#6b7280", fontSize: "16px" }}>Instant recommendation</p>
            </div>

          </div>
        </div>
      )}

      {activeTab === 'fertilizer' && (
        <div style={{ ...cardStyle, maxWidth: "700px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "25px", animation: "fadeIn 0.3s ease-out" }}>
          <h2 style={{ margin: "0", color: "#333", fontSize: "28px", textAlign: "center" }}>
            Find the right fertilizer for your crop
          </h2>

          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "10px" }}>
            <div style={{ flex: 1, minWidth: "250px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#4b5563" }}>Select Crop</label>
              <select 
                name="crop" 
                value={fertInputs.crop} 
                onChange={handleFertChange}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "16px", backgroundColor: "#f9fafb" }}
              >
                {['Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane', 'Mango', 'Banana', 'Grapes', 'Apple', 'Chickpea'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            
            <div style={{ flex: 1, minWidth: "250px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#4b5563" }}>Soil Type</label>
              <select 
                name="soil" 
                value={fertInputs.soil} 
                onChange={handleFertChange}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "16px", backgroundColor: "#f9fafb" }}
              >
                {['Sandy', 'Loamy', 'Clay', 'Black', 'Red'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "10px" }}>
            <div style={{ flex: 1, minWidth: "150px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#4b5563" }}>Nitrogen (N) Level</label>
              <input 
                type="number" 
                name="N" 
                min="0" max="140" 
                value={fertInputs.N} 
                onChange={handleFertChange}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "16px", boxSizing: "border-box" }}
              />
            </div>
            
            <div style={{ flex: 1, minWidth: "150px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#4b5563" }}>Phosphorus (P) Level</label>
              <input 
                type="number" 
                name="P" 
                min="0" max="140" 
                value={fertInputs.P} 
                onChange={handleFertChange}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "16px", boxSizing: "border-box" }}
              />
            </div>
            
            <div style={{ flex: 1, minWidth: "150px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#4b5563" }}>Potassium (K) Level</label>
              <input 
                type="number" 
                name="K" 
                min="0" max="200" 
                value={fertInputs.K} 
                onChange={handleFertChange}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "16px", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <button
            onClick={getFertilizerRecommendation}
            style={{
              padding: "16px",
              backgroundColor: "#16a34a",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "18px",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "background-color 0.2s",
              marginTop: "20px"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#15803d"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#16a34a"}
          >
            Get Fertilizer Recommendation
          </button>

          {fertResult && (
            <div style={{
              marginTop: "20px",
              padding: "25px",
              backgroundColor: fertResult.colorBg,
              borderRadius: "12px",
              border: `2px solid ${fertResult.colorText}`,
              animation: "fadeIn 0.3s ease-out"
            }}>
              <h3 style={{ margin: "0 0 15px 0", color: fertResult.colorText, fontSize: "24px" }}>
                🧪 {fertResult.title}
              </h3>
              <ul style={{ margin: "0 0 20px 0", paddingLeft: "20px", color: "#374151", fontSize: "18px", lineHeight: "1.6" }}>
                <li><strong>Dosage:</strong> {fertResult.dosage}</li>
                <li><strong>Best time:</strong> {fertResult.time}</li>
              </ul>
              
              <div style={{
                backgroundColor: "#fef3c7",
                borderLeft: "4px solid #f59e0b",
                padding: "15px",
                borderRadius: "4px",
                display: "flex",
                gap: "10px",
                alignItems: "flex-start"
              }}>
                <span style={{ fontSize: "20px" }}>⚠️</span>
                <p style={{ margin: "0", color: "#92400e", fontSize: "14px", fontWeight: "600", lineHeight: "1.4" }}>
                  Warning: Always consult local agriculture department for exact dosage.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: "12px",
  padding: "30px",
  boxShadow: "0 4px 15px rgba(0,0,0,0.05)"
};

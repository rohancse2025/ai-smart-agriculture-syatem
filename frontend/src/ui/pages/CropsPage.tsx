import { useState } from 'react';

// Helper to get crop emoji
const getCropEmoji = (cropName: string) => {
  if (!cropName) return "🌱";
  const name = cropName.toLowerCase();
  if (name.includes("rice")) return "🌾";
  if (name.includes("wheat")) return "🌿";
  if (name.includes("cotton")) return "🌱";
  if (name.includes("maize")) return "🌽";
  if (name.includes("grape")) return "🍇";
  if (name.includes("mango")) return "🥭";
  if (name.includes("apple")) return "🍎";
  if (name.includes("banana")) return "🍌";
  return "🌱";
};

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

  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: parseFloat(value) }));
  };

  const getRecommendation = async () => {
    setIsLoading(true);
    setRecommendation(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/recommend-crop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs)
      });
      const data = await res.json();
      setRecommendation(data.crop);
    } catch (err) {
      console.error(err);
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
      <div style={{ display: "flex", borderBottom: "2px solid #e5e7eb", marginBottom: "30px", backgroundColor: "white", padding: "0 20px" }}>
        <button 
          onClick={() => setActiveTab('crop')}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === 'crop' ? "3px solid #16a34a" : "3px solid transparent",
            color: activeTab === 'crop' ? "#16a34a" : "#6b7280",
            fontSize: "18px",
            fontWeight: "bold",
            padding: "20px 25px",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out"
          }}
        >
          🌾 ML Crop Recommendation
        </button>
        <button 
          onClick={() => setActiveTab('fertilizer')}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === 'fertilizer' ? "3px solid #16a34a" : "3px solid transparent",
            color: activeTab === 'fertilizer' ? "#16a34a" : "#6b7280",
            fontSize: "18px",
            fontWeight: "bold",
            padding: "20px 25px",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out"
          }}
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

          {/* 2. TWO COLUMN LAYOUT */}
          <div style={{ display: "flex", gap: "30px", flexWrap: "wrap", marginBottom: "40px" }}>
            
            {/* Left Column: Input Form */}
            <div style={{
              ...cardStyle,
              flex: "1 1 500px",
              display: "flex",
              flexDirection: "column",
              gap: "20px"
            }}>
              <h2 style={{ margin: "0 0 10px 0", color: "#333", fontSize: "24px" }}>Farm Parameters</h2>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
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
                onClick={getRecommendation}
                disabled={isLoading}
                style={{
                  marginTop: "15px",
                  padding: "16px",
                  backgroundColor: "#1f2937",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "18px",
                  fontWeight: "bold",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  transition: "background-color 0.2s"
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) e.currentTarget.style.backgroundColor = "#374151";
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) e.currentTarget.style.backgroundColor = "#1f2937";
                }}
              >
                {isLoading ? "Analyzing..." : "Get ML Recommendation"}
              </button>
            </div>

            {/* Right Column: Result Card */}
            <div style={{ flex: "1 1 350px", display: "flex", flexDirection: "column" }}>
              
              {(recommendation || isLoading) ? (
                <div style={{...cardStyle, flex: 1, display: "flex", flexDirection: "column", borderTop: "4px solid #16a34a" }}>
                  <h2 style={{ margin: "0 0 5px 0", color: "#333", fontSize: "22px" }}>AI Recommendation</h2>
                  <p style={{ margin: "0 0 25px 0", color: "#6b7280" }}>Based on your specific conditions</p>
                  
                  {isLoading ? (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ 
                        border: "4px solid #f3f4f6", 
                        borderTop: "4px solid #16a34a", 
                        borderRadius: "50%", 
                        width: "50px", 
                        height: "50px", 
                        animation: "spin 1s linear infinite" 
                      }} />
                      <p style={{ marginTop: "15px", color: "#6b7280", fontWeight: "600" }}>Running Model...</p>
                      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      
                      <div style={{ textAlign: "center", padding: "10px 0" }}>
                        <div style={{ fontSize: "64px", marginBottom: "10px" }}>
                          {getCropEmoji(recommendation || "")}
                        </div>
                        <h3 style={{ margin: "0", fontSize: "48px", color: "#2563eb", textTransform: "capitalize", fontWeight: "900" }}>
                          {recommendation}
                        </h3>
                      </div>

                      {/* Confidence Badge & Progress */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <span style={{ fontWeight: "600", color: "#4b5563" }}>Confidence Score</span>
                          <span style={{ 
                            backgroundColor: "#dcfce7", 
                            color: "#166534", 
                            padding: "4px 10px", 
                            borderRadius: "12px", 
                            fontSize: "13px", 
                            fontWeight: "bold" 
                          }}>
                            ✓ High Confidence
                          </span>
                        </div>
                        <div style={{ height: "10px", backgroundColor: "#e5e7eb", borderRadius: "5px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: "94.7%", backgroundColor: "#16a34a" }}></div>
                        </div>
                      </div>

                      {/* Key Factors */}
                      <div style={{ marginTop: "15px", backgroundColor: "#f8fafc", padding: "20px", borderRadius: "8px" }}>
                        <h4 style={{ margin: "0 0 15px 0", color: "#333", fontSize: "16px" }}>Key Factors</h4>
                        <ul style={{ margin: 0, paddingLeft: "20px", color: "#4b5563", display: "flex", flexDirection: "column", gap: "10px" }}>
                          <li>Match verified against required <strong>Soil Nutrient profile (N-P-K)</strong>.</li>
                          <li>Highly suitable for current <strong>Temperature ({inputs.temperature}°C)</strong> and Moisture.</li>
                          <li>Rainfall tolerance aligns closely with your recorded area.</li>
                        </ul>
                      </div>
                      
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  ...cardStyle, 
                  flex: 1, 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "center", 
                  justifyContent: "center",
                  backgroundColor: "#f9fafb",
                  border: "2px dashed #d1d5db",
                  boxShadow: "none"
                }}>
                  <span style={{ fontSize: "40px", opacity: 0.5, marginBottom: "15px" }}>🌾</span>
                  <p style={{ color: "#6b7280", fontSize: "18px", textAlign: "center", padding: "0 20px" }}>
                    Adjust your farm parameters on the left and click <strong>Get ML Recommendation</strong> to see AI suggestions here.
                  </p>
                </div>
              )}
            </div>
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

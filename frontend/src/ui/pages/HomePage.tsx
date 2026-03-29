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

// Skeleton Loader Component
const Skeleton = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-slate-700 rounded ${className}`} />
);

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

    if (ph >= 6 && ph <= 7.5) score += 4;
    if (ph < 5.5) tips.push("Add lime to increase pH");
    if (ph > 7.5) tips.push("Add sulfur to reduce pH");

    if (n > 40) score += 3;
    if (n < 40) tips.push("Apply urea fertilizer");

    if (m >= 30 && m <= 70) score += 3;
    if (m < 30) tips.push("Increase irrigation");
    if (m > 70) tips.push("Improve field drainage");

    if (tips.length === 0) tips.push("Your soil is healthy — maintain current practices");

    setSoilAnalysisResult({ score, tips });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sensorRes = await fetch('http://127.0.0.1:8000/api/v1/sensor-data');
        const data: SensorData = await sensorRes.json();
        setSensorData(data);

        const cropRes = await fetch(`http://127.0.0.1:8000/api/v1/recommend-crop?temperature=${data.temperature}&humidity=${data.humidity}&ph=6.5&rainfall=100`);
        const cropJson: CropRecommendation = await cropRes.json();
        setRecommendedCrop(cropJson.crop);
        
        const irrigationRes = await fetch(`http://127.0.0.1:8000/api/v1/irrigation-suggestion?soil_moisture=${data.soil_moisture}`);
        const irrigationJson: IrrigationSuggestion = await irrigationRes.json();
        setIrrigation(irrigationJson);
        
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

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

    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="font-sans">
      
      {/* 1. HERO SECTION (Full-Width Image Background) */}
      <section className="relative min-h-[500px] -mx-8 md:-mx-12 mb-12 flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&q=80" 
            alt="Rice field" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-green-900/40" />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 px-6 py-12 flex flex-col items-center text-center max-w-4xl">
          <div className="inline-block bg-[#16a34a] text-white text-sm font-bold px-4 py-1 rounded-full mb-6 whitespace-nowrap shadow-lg">
            🌿 AI Powered Farming
          </div>
          
          <h1 className="text-white text-[32px] md:text-[54px] font-bold leading-tight mb-6 tracking-tight drop-shadow-md">
            Empowering Farmers with Next-Gen AI & IoT
          </h1>
          
          <p className="text-white/90 text-lg md:text-xl font-medium mb-10 leading-relaxed max-w-2xl drop-shadow-sm">
            Smart crop recommendations, disease detection, live IoT monitoring — all in one platform
          </p>

          <div className="flex flex-col sm:flex-row gap-5">
            <button 
              onClick={() => navigate('/crops')}
              className="bg-white text-[#16a34a] font-bold rounded-2xl py-3.5 px-10 text-lg transition-all hover:bg-green-50 active:scale-95 shadow-xl"
            >
              Get Crop Recommendation
            </button>
            <button 
              onClick={() => navigate('/scan')}
              className="bg-transparent border-2 border-white text-white font-bold rounded-2xl py-3.5 px-10 text-lg transition-all hover:bg-white/10 active:scale-95 shadow-lg backdrop-blur-sm"
            >
              Scan Disease
            </button>
          </div>
        </div>
      </section>

      {/* 2. WEATHER CARD (Blue Background) */}
      <section className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-8 mb-10 shadow-sm border border-blue-200 dark:border-blue-800">
        <h2 className="text-xl text-gray-900 dark:text-white m-0 mb-6 font-bold flex items-center gap-2 uppercase tracking-widest text-xs opacity-50">🌤️ Today's Weather</h2>
        
        <div className="flex gap-8 items-center flex-wrap mb-6">
          <div className="min-w-[200px]">
            <div className="flex flex-col gap-2">
              {weatherLoading ? (
                <>
                  <Skeleton className="h-16 w-32" />
                  <Skeleton className="h-8 w-48" />
                </>
              ) : (
                <>
                  <span className="text-6xl font-black text-blue-900 dark:text-blue-300 leading-none">
                    {weatherData?.temperature !== undefined ? `${Math.round(weatherData.temperature * 10) / 10}°C` : "N/A"}
                  </span>
                  <p className="m-0 mt-1 text-blue-500 dark:text-blue-400 font-bold text-xl">
                    {weatherData?.condition || ""}
                  </p>
                  {weatherData?.city && (
                    <p className="m-0 text-sm text-blue-400 font-semibold italic">
                      📍 {weatherData.city}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className="flex gap-5 flex-1 flex-wrap">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl flex-[1_1_150px] text-center shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
              <p className="m-0 mb-1 text-gray-400 text-xs font-black uppercase tracking-widest">Humidity</p>
              <p className="m-0 font-bold text-gray-800 dark:text-white text-2xl">
                {weatherLoading ? <Skeleton className="h-8 w-16 mx-auto" /> : weatherData?.humidity !== undefined ? `${weatherData.humidity}%` : "N/A"}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl flex-[1_1_150px] text-center shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
              <p className="m-0 mb-1 text-gray-400 text-xs font-black uppercase tracking-widest">Wind Speed</p>
              <p className="m-0 font-bold text-gray-800 dark:text-white text-2xl">
                {weatherLoading ? <Skeleton className="h-8 w-16 mx-auto" /> : weatherData?.wind_speed !== undefined ? `${weatherData.wind_speed} m/s` : "N/A"}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-blue-200 dark:border-blue-800 pt-5">
          <p className="m-0 text-green-700 dark:text-green-400 italic font-bold text-lg min-h-[28px]">
            {weatherLoading ? <Skeleton className="h-6 w-64" /> : weatherData?.farming_tip ? `💡 ${weatherData.farming_tip}` : "💡 Good farming conditions today"}
          </p>
        </div>
      </section>

      {/* 3. LIVE FARM DATA */}
      <section className="mb-14">
        <h2 className="text-xl text-gray-900 dark:text-white mb-6 font-black uppercase tracking-widest text-xs opacity-50">Live Farm Data</h2>
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-7 min-h-[160px] shadow-sm border border-gray-100 dark:border-slate-700 border-t-4 border-t-[#ef4444] flex flex-col justify-between">
            <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-full flex justify-center items-center">
              <span className="text-2xl">🌡️</span>
            </div>
            <div className="mt-6">
              <div className="min-h-[44px]">
                {isLoading ? <Skeleton className="h-9 w-24" /> : <h3 className="m-0 mb-1 text-[36px] font-black tracking-tight text-gray-900 dark:text-white leading-none">{sensorData?.temperature !== undefined ? `${sensorData.temperature}°C` : "N/A"}</h3>}
              </div>
              <p className="m-0 text-[14px] text-gray-400 font-bold uppercase tracking-wider pl-0.5 mt-1">Temperature</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-7 min-h-[160px] shadow-sm border border-gray-100 dark:border-slate-700 border-t-4 border-t-[#3b82f6] flex flex-col justify-between">
            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-full flex justify-center items-center">
              <span className="text-2xl">💧</span>
            </div>
            <div className="mt-6">
              <div className="min-h-[44px]">
                {isLoading ? <Skeleton className="h-9 w-24" /> : <h3 className="m-0 mb-1 text-[36px] font-black tracking-tight text-gray-900 dark:text-white leading-none">{sensorData?.humidity !== undefined ? `${sensorData.humidity}%` : "N/A"}</h3>}
              </div>
              <p className="m-0 text-[14px] text-gray-400 font-bold uppercase tracking-wider pl-0.5 mt-1">Humidity</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-7 min-h-[160px] shadow-sm border border-gray-100 dark:border-slate-700 border-t-4 border-t-[#16a34a] flex flex-col justify-between">
            <div className="w-14 h-14 bg-green-50 dark:bg-green-900/20 rounded-full flex justify-center items-center">
              <span className="text-2xl">🌱</span>
            </div>
            <div className="mt-6">
              <div className="min-h-[44px]">
                {isLoading ? <Skeleton className="h-9 w-24" /> : <h3 className="m-0 mb-1 text-[36px] font-black tracking-tight text-gray-900 dark:text-white leading-none">{sensorData?.soil_moisture !== undefined ? `${sensorData.soil_moisture}%` : "N/A"}</h3>}
              </div>
              <p className="m-0 text-[14px] text-gray-400 font-bold uppercase tracking-wider pl-0.5 mt-1">Soil Moisture</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-7 min-h-[160px] shadow-sm border border-gray-100 dark:border-slate-700 border-t-4 border-t-[#f97316] flex flex-col justify-between">
            <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/20 rounded-full flex justify-center items-center">
              <span className="text-2xl">🚰</span>
            </div>
            <div className="mt-6">
              <div className="min-h-[44px]">
                {isLoading ? <Skeleton className="h-9 w-24" /> : (
                  <h3 className={`m-0 mb-1 text-[36px] font-black tracking-tight leading-none ${irrigation?.status === "ON" ? "text-red-500" : irrigation?.status === "MODERATE" ? "text-orange-500" : "text-green-600"}`}>
                    {irrigation?.status || "N/A"}
                  </h3>
                )}
              </div>
              <p className="m-0 text-[14px] text-gray-400 font-bold uppercase tracking-wider pl-0.5 mt-1">Irrigation</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. AI RECOMMENDATION + QUICK TIPS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <section>
          <h2 className="text-xl text-gray-900 dark:text-white mb-6 font-black uppercase tracking-widest text-xs opacity-50">AI Recommendation</h2>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 shadow-sm border border-gray-100 dark:border-slate-700 h-full flex flex-col items-center justify-center text-center bg-gradient-to-br from-white to-green-50 dark:to-green-900/10">
            {isLoading ? (
              <>
                <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full animate-pulse mb-6" />
                <Skeleton className="h-10 w-48 mb-4" />
                <Skeleton className="h-6 w-32 rounded-full" />
              </>
            ) : (
              <>
                <span className="text-6xl mb-6">🌾</span>
                <p className="m-0 mb-2 text-gray-400 text-[10px] font-black uppercase tracking-widest">Recommended Crop</p>
                <h3 className="m-0 mb-4 text-4xl text-green-700 dark:text-green-500 capitalize font-black tracking-tight">
                  {recommendedCrop || "Analyzing..."}
                </h3>
                <span className="bg-green-600 text-white py-2 px-6 rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-green-600/20">
                  Ideal Match
                </span>
              </>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xl text-gray-900 dark:text-white mb-6 font-black uppercase tracking-widest text-xs opacity-50">Quick Tips</h2>
          <div className="flex flex-col gap-4">
            {isLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 flex items-center gap-4">
                   <div className="w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-xl animate-pulse flex-shrink-0" />
                   <div className="flex-1 space-y-2">
                     <Skeleton className="h-4 w-full" />
                     <Skeleton className="h-3 w-3/4" />
                   </div>
                </div>
              ))
            ) : (
              getDynamicTips(
                sensorData?.temperature || 25,
                sensorData?.humidity || 50,
                sensorData?.soil_moisture || 50,
                weatherData?.condition || "Sunny"
              ).map((tip, idx) => {
                const borderColors = { warning: "border-l-amber-500", good: "border-l-green-600", info: "border-l-blue-500" };
                const bgIcons = { warning: "bg-orange-50 dark:bg-orange-900/20", good: "bg-green-50 dark:bg-green-900/20", info: "bg-blue-50 dark:bg-blue-900/20" };
                
                return (
                  <div key={idx} className={`bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 flex items-center gap-5 border-l-4 rounded-l-sm ${borderColors[tip.type]}`}>
                    <div className={`w-14 h-14 rounded-xl flex justify-center items-center flex-shrink-0 ${bgIcons[tip.type]}`}>
                      <span className="text-2xl">{tip.icon}</span>
                    </div>
                    <p className="m-0 text-gray-600 dark:text-slate-300 text-sm leading-snug font-bold">
                      {tip.text}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* 5. SOIL ANALYSIS */}
      <section className="mb-4 pb-4">
        <h2 className="text-xl text-gray-900 dark:text-white m-0 mb-1 font-bold uppercase tracking-widest text-xs opacity-50">
          🧪 Soil Health Analysis
        </h2>
        <p className="m-0 mb-8 text-gray-400 text-sm font-medium">Quick check based on your manual readings</p>
        
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className={`flex gap-6 flex-wrap mb-6 ${isMobile ? 'flex-col' : 'flex-row'}`}>
            <div className="flex-1 min-w-[200px]">
              <label className="block mb-2 font-bold text-gray-500 dark:text-slate-400 text-sm">Soil pH</label>
              <input 
                type="number" step="0.1" min="0" max="14" placeholder="e.g. 6.5"
                value={soilInputs.ph}
                onChange={(e) => setSoilInputs({...soilInputs, ph: e.target.value})}
                className="w-full p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-base focus:border-[#16a34a] focus:ring-4 focus:ring-green-50 dark:focus:ring-green-900/20 outline-none transition-all"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block mb-2 font-bold text-gray-500 dark:text-slate-400 text-sm">Nitrogen (mg/kg)</label>
              <input 
                type="number" min="0" max="140" placeholder="e.g. 40"
                value={soilInputs.nitrogen}
                onChange={(e) => setSoilInputs({...soilInputs, nitrogen: e.target.value})}
                className="w-full p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-base focus:border-[#16a34a] focus:ring-4 focus:ring-green-50 dark:focus:ring-green-900/20 outline-none transition-all"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block mb-2 font-bold text-gray-500 dark:text-slate-400 text-sm">Moisture (%)</label>
              <input 
                type="number" min="0" max="100" placeholder="e.g. 50"
                value={soilInputs.moisture}
                onChange={(e) => setSoilInputs({...soilInputs, moisture: e.target.value})}
                className="w-full p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-base focus:border-[#16a34a] focus:ring-4 focus:ring-green-50 dark:focus:ring-green-900/20 outline-none transition-all"
              />
            </div>
          </div>

          <button
            onClick={analyzeSoil}
            className="w-full py-4.5 bg-[#16a34a] text-white border-none rounded-xl text-lg font-black cursor-pointer shadow-lg shadow-green-600/30 transition-all hover:bg-green-700 active:scale-[0.98]"
          >
            Analyse Soil
          </button>

          {soilAnalysisResult && (
            <div className={`mt-8 p-8 rounded-2xl border-2 animate-fade-in
              ${soilAnalysisResult.score >= 8 ? 'bg-green-50 dark:bg-green-900/10 border-green-600' : soilAnalysisResult.score >= 5 ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-500' : 'bg-red-50 dark:bg-red-900/10 border-red-500'}`}>
              <div className="mb-4">
                <h3 className={`m-0 text-2xl font-black tracking-tight
                  ${soilAnalysisResult.score >= 8 ? 'text-green-800 dark:text-green-400' : soilAnalysisResult.score >= 5 ? 'text-orange-800 dark:text-orange-400' : 'text-red-800 dark:text-red-400'}`}>
                  {soilAnalysisResult.score >= 8 ? "Excellent Soil Health 🌱" : soilAnalysisResult.score >= 5 ? "Moderate Soil Health ⚠️" : "Poor Soil Health ❌"}
                </h3>
              </div>
              
              <ul className="m-0 pl-6 text-gray-700 dark:text-slate-300 text-lg space-y-2 font-medium">
                {soilAnalysisResult.tips.map((tip: string, idx: number) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}

/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import axios from 'axios';

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-slate-700 rounded ${className}`} />
);

export default function HomePage({ lang }: { lang: string }) {
  const navigate = useNavigate();
  const { t } = useTranslation(lang);
  const [isPageOnline, setIsPageOnline] = useState(navigator.onLine);
  const [showSyncMessage, setShowSyncMessage] = useState(false);

  const handleSync = () => {
    setShowSyncMessage(true);
    setTimeout(() => setShowSyncMessage(false), 3000);
  };
  
  // 1. Auth & Profile
  const isLoggedIn = !!localStorage.getItem('kisancore_farmer');
  const farmer = JSON.parse(localStorage.getItem('kisancore_farmer') || 'null');

  // 2. State for dashboard
  const [weatherData, setWeatherData] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [sensorData, setSensorData] = useState<any>({ temperature: null, humidity: null, soil_moisture: null });
  const [isLoading, setIsLoading] = useState(true);
  const [irrigation, setIrrigation] = useState<any>(null);
  const [marketPrice, setMarketPrice] = useState<any>(null);
  
  const [recommendedCrop, setRecommendedCrop] = useState<any>(null);
  const [isRecLoading, setIsRecLoading] = useState(false);

  const isMobile = window.innerWidth < 768;

  // Effects
  useEffect(() => {
    const handleOnline = () => {
      setIsPageOnline(true);
      setShowSyncMessage(true);
      setTimeout(() => setShowSyncMessage(false), 5000);
    };
    const handleOffline = () => setIsPageOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      // Default to Ludhiana, Punjab (Agricultural hub) if geolocation fails or is denied
      let lat = 30.9010;
      let lon = 75.8573;

      const getAndFetch = async (latitude: number, longitude: number) => {
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/v1/weather?lat=${latitude}&lon=${longitude}`);
          setWeatherData(res.data);
        } catch (err) {
          console.error("Weather fetch failed", err);
        } finally {
          setWeatherLoading(false);
        }
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            getAndFetch(pos.coords.latitude, pos.coords.longitude);
          },
          () => {
            // Fallback to default
            getAndFetch(lat, lon);
          }
        );
      } else {
        // No geolocation support
        getAndFetch(lat, lon);
      }
    };
    fetchWeather();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/v1/iot/latest`);
        const data = res.data;
        
        setSensorData({
          temperature: data.temperature,
          humidity: data.humidity,
          soil_moisture: data.soil_moisture
        });
        
        setIrrigation({ 
          needed: data.irrigation_needed, 
          message: data.suggestion 
        });
      } catch (err) {
        console.error("Dashboard data fetch failed", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/v1/market?state=Karnataka&commodity=Potato`);
        if (res.data && res.data.length > 0) setMarketPrice(res.data[0]);
      } catch (err) {}
    };
    fetchMarket();
  }, []);

  const getWeatherEmoji = (condition: string, temp: number) => {
    const c = condition.toLowerCase();
    if (c.includes("rain")) return "🌧️";
    if (c.includes("cloud")) return "⛅";
    if (temp > 35) return "🌡️";
    return "☀️";
  };

  const getTrend = (val: number, type: 'temp' | 'hum' | 'moist') => {
    if (type === 'temp') return val > 30 ? "↑" : val < 20 ? "↓" : "→";
    if (type === 'hum') return val > 70 ? "↑" : val < 40 ? "↓" : "→";
    return val > 60 ? "↑" : val < 30 ? "↓" : "→";
  };

  const currentSensorData = isPageOnline ? sensorData : JSON.parse(
    localStorage.getItem('last_sensor') || 
    '{"temperature":28,"humidity":65,"soil_moisture":45}'
  );

  useEffect(() => {
    if (isPageOnline && sensorData.temperature !== null) {
      localStorage.setItem('last_sensor', JSON.stringify(sensorData));
    }
  }, [sensorData, isPageOnline]);

  useEffect(() => {
    const fetchRecommendation = async () => {
      if (!isLoggedIn || !sensorData.temperature) return;
      
      setIsRecLoading(true);
      try {
        const res = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/v1/crops`, {
          nitrogen: 45.0,
          phosphorus: 40.0,
          potassium: 40.0,
          temperature: sensorData.temperature,
          humidity: sensorData.humidity,
          ph: 6.5,
          rainfall: 50.0 
        });
        if (res.data.crops && res.data.crops.length > 0) {
          setRecommendedCrop(res.data.crops[0]);
        }
      } catch (err) {
        console.error("Failed to fetch recommendation", err);
      } finally {
        setIsRecLoading(false);
      }
    };

    const timer = setTimeout(fetchRecommendation, 1500);
    return () => clearTimeout(timer);
  }, [sensorData.temperature, sensorData.soil_moisture, isLoggedIn]);

  const getDynamicTips = (temp: number, hum: number, moist: number, condition: string) => {
    const tips = [];
    if (moist < 30) tips.push({ icon: "🚰", text: "Soil is very dry. Consider starting irrigation now.", type: "warning" });
    else if (moist > 75) tips.push({ icon: "🌊", text: "Soil is saturated. Check drainage to avoid root rot.", type: "warning" });
    else tips.push({ icon: "✅", text: "Soil moisture is in the healthy range.", type: "good" });

    if (temp > 35) tips.push({ icon: "🔥", text: "High temperature detected. Avoid midday spraying.", type: "warning" });
    if (condition.toLowerCase().includes("rain")) tips.push({ icon: "🌧️", text: "Rain expected. You might pause automated irrigation.", type: "info" });
    
    return tips.length > 0 ? tips : [{ icon: "🌾", text: "Conditions are stable for your crops.", type: "good" }];
  };

  return (
    <div className="font-sans">
      
      {/* Offline Banner */}
      {!isPageOnline && (
        <div className="bg-amber-100 border-b border-amber-200 py-3 px-6 text-amber-800 text-center font-bold text-sm animate-fade-in flex items-center justify-center gap-2">
          <span>⚠️</span> {t('common_offline')} — Showing last saved data. Soil analysis and irrigation work fully offline.
        </div>
      )}

      {/* Back Online Message */}
      {showSyncMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-green-600 text-white py-2 px-6 rounded-full font-bold shadow-2xl animate-fade-in flex items-center gap-2">
          <span>🟢</span> Back online — Syncing latest data...
        </div>
      )}
      


      {/* 1. HERO SECTION */}
      <section className="relative min-h-[500px] -mx-8 md:-mx-12 mb-12 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&q=80" 
            alt="Rice field" 
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-green-900/40" />
        </div>

        <div className="relative z-10 px-6 py-12 flex flex-col items-center text-center max-w-4xl">
          {!isLoggedIn ? (
            <>
              <div className="inline-block bg-[#16a34a] text-white text-sm font-bold px-4 py-1 rounded-full mb-6 whitespace-nowrap shadow-lg animate-fade-in-up [animation-delay:100ms]">
                🌿 AI Powered Farming
              </div>
              
              <h1 className="text-white text-[32px] md:text-[54px] font-bold leading-tight mb-6 tracking-tight drop-shadow-md animate-fade-in-up [animation-delay:300ms]">
                Empowering Farmers with <br />
                <span className="text-[#4ade80]">Next-Gen AI & IoT</span>
              </h1>
              
              <p className="text-white/90 text-lg md:text-xl font-medium mb-10 leading-relaxed max-w-2xl drop-shadow-sm animate-fade-in-up [animation-delay:500ms]">
                {t('hero_tagline')}
              </p>

              <div className="flex flex-col sm:flex-row gap-5 animate-fade-in-up [animation-delay:700ms]">
                <button 
                  onClick={() => navigate('/crops')}
                  className="bg-white text-[#16a34a] font-bold rounded-2xl py-3.5 px-10 text-lg transition-all hover:bg-green-50 active:scale-95 shadow-xl hover-lift ripple"
                >
                  {t('hero_get_crop')}
                </button>
                <button 
                  onClick={() => navigate('/scan')}
                  className="bg-transparent border-2 border-white text-white font-bold rounded-2xl py-3.5 px-10 text-lg transition-all hover:bg-white/10 active:scale-95 shadow-lg backdrop-blur-sm hover-lift ripple"
                >
                  {t('hero_scan')}
                </button>
              </div>

              {/* Login hint banner */}
              <div className="mt-6 bg-white/15 backdrop-blur-sm rounded-full px-6 py-2.5 flex items-center gap-3 animate-fade-in-up [animation-delay:900ms]">
                <span className="text-white/80 text-sm font-medium">
                  💡 Login to save crop history & control IoT remotely
                </span>
                <button
                  onClick={() => navigate('/login')}
                  className="text-green-300 font-black text-sm hover:text-white transition-colors whitespace-nowrap"
                >
                  Login →
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="inline-block bg-[#16a34a] text-white text-sm font-bold px-4 py-1 rounded-full mb-6 whitespace-nowrap shadow-lg animate-fade-in-up [animation-delay:100ms]">
                🌿 KisanCore AI V2.0
              </div>
              
              <h1 className="text-white text-[32px] md:text-[54px] font-bold leading-tight mb-6 tracking-tight drop-shadow-md animate-fade-in-up [animation-delay:300ms]">
                Welcome back, <span className="text-[#4ade80]">{farmer.name}!</span> 👨‍🌾
              </h1>
              
              <p className="text-white/90 text-lg md:text-xl font-medium mb-10 leading-relaxed max-w-2xl drop-shadow-sm animate-fade-in-up [animation-delay:500ms]">
                Your smart farming dashboard is updated with the latest sensor data and crop insights.
              </p>

              <div className="flex flex-col sm:flex-row gap-5 animate-fade-in-up [animation-delay:700ms]">
                <button 
                  onClick={() => navigate('/scan')}
                  className="bg-white text-[#16a34a] font-bold rounded-2xl py-3.5 px-10 text-lg transition-all hover:bg-green-50 active:scale-95 shadow-xl hover-lift ripple"
                >
                  📷 {t('hero_scan')}
                </button>
                <button 
                  onClick={() => navigate('/chat')}
                  className="bg-transparent border-2 border-white text-white font-bold rounded-2xl py-3.5 px-10 text-lg transition-all hover:bg-white/10 active:scale-95 shadow-lg backdrop-blur-sm hover-lift ripple"
                >
                  💬 Ask AI Expert
                </button>
              </div>
            </>
          )}
        </div>
      </section>


      {/* 2. WEATHER CARD */}
      <section className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-8 mb-10 shadow-sm border border-blue-200 dark:border-blue-800 animate-fade-in-up hover-lift">
        <h2 className="text-xl text-gray-900 dark:text-white m-0 mb-6 font-bold flex items-center gap-2 uppercase tracking-widest text-xs opacity-50">🌤️ {t('home_weather')}</h2>
        
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
                  <div className="flex items-center gap-4">
                    <span className="text-6xl font-black text-blue-900 dark:text-blue-300 leading-none">
                      {weatherData?.temperature !== undefined ? `${Math.round(weatherData.temperature * 10) / 10}°C` : "N/A"}
                    </span>
                    <span className="text-5xl">{getWeatherEmoji(weatherData?.condition || "", weatherData?.temperature || 25)}</span>
                  </div>
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
              <p className="m-0 mb-1 text-gray-400 text-xs font-black uppercase tracking-widest">{t('iot_hum')}</p>
              <p className="m-0 font-bold text-gray-800 dark:text-white text-2xl">
                {weatherLoading ? <Skeleton className="h-8 w-16 mx-auto" /> : weatherData?.humidity !== undefined ? `${weatherData.humidity}%` : "N/A"}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl flex-[1_1_150px] text-center shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
              <p className="m-0 mb-1 text-gray-400 text-xs font-black uppercase tracking-widest">{t('weather_wind')}</p>
              <p className="m-0 font-bold text-gray-800 dark:text-white text-2xl">
                {weatherLoading ? <Skeleton className="h-8 w-16 mx-auto" /> : weatherData?.wind_speed !== undefined ? `${weatherData.wind_speed} m/s` : "N/A"}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-blue-200 dark:border-blue-800 pt-5 flex items-center justify-between gap-4 flex-wrap">
          <p className="m-0 text-green-700 dark:text-green-400 italic font-bold text-lg min-h-[28px]">
            {weatherLoading ? <Skeleton className="h-6 w-64" /> : weatherData?.farming_tip ? `💡 ${weatherData.farming_tip}` : "💡 Good farming conditions today"}
          </p>
          
          {!weatherLoading && weatherData && (
            <button
              onClick={() => navigate('/chat', { 
                state: { 
                  prefill: `It is currently ${Math.round(weatherData.temperature * 10) / 10}°C with ${weatherData.condition} and ${weatherData.humidity}% humidity in ${weatherData.city || 'my area'}. What farming advice do you have for today?` 
                } 
              })}
              className="bg-white border-2 border-[#16a34a] text-[#16a34a] py-2 px-3.5 rounded-xl text-[13px] font-black cursor-pointer shadow-sm transition-all hover:bg-[#f0fdf4] active:scale-95 flex items-center gap-2"
            >
              🤖 Ask AI about today's weather
            </button>
          )}
        </div>
      </section>

      {/* 3. FARMER STATS + LIVE FARM DATA */}
      <section className="mb-14">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl text-gray-900 dark:text-white font-black uppercase tracking-widest text-xs opacity-50 m-0">{t('home_sensor_data')}</h2>
          {isPageOnline ? (
            <span className="bg-green-100 text-green-700 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-green-200 animate-pulse tracking-widest">{t('common_online')}</span>
          ) : sensorData.temperature !== null ? (
            <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-orange-200 tracking-widest">{t('common_offline')} - LAST DATA</span>
          ) : null}
        </div>
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          {/* TEMPERATURE */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-7 min-h-[160px] shadow-sm border border-gray-100 dark:border-slate-700 border-t-4 border-t-[#ef4444] flex flex-col justify-between hover-lift">
            <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-full flex justify-center items-center font-bold text-xl">
              🌡️
            </div>
            <div className="mt-6">
              <div className="min-h-[44px] flex items-center gap-3">
                {isLoading ? <Skeleton className="h-9 w-24" /> : (
                  <>
                    <h3 className="m-0 mb-1 text-[36px] font-black tracking-tighter text-gray-900 dark:text-white leading-none">
                      {currentSensorData?.temperature || 0}°C
                    </h3>
                    <span className={`text-xl font-bold ${getTrend(currentSensorData?.temperature || 25, 'temp') === '↑' ? 'text-red-500' : 'text-blue-500'}`}>
                      {getTrend(currentSensorData?.temperature || 25, 'temp')}
                    </span>
                  </>
                )}
              </div>
              <p className="m-0 text-[12px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1 pr-1">{t('iot_temp')}</p>
            </div>
          </div>

          {/* HUMIDITY */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-7 min-h-[160px] shadow-sm border border-gray-100 dark:border-slate-700 border-t-4 border-t-[#3b82f6] flex flex-col justify-between hover-lift">
            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-full flex justify-center items-center font-bold text-xl">
              💧
            </div>
            <div className="mt-6">
              <div className="min-h-[44px] flex items-center gap-3">
                {isLoading ? <Skeleton className="h-9 w-24" /> : (
                  <>
                    <h3 className="m-0 mb-1 text-[36px] font-black tracking-tighter text-gray-900 dark:text-white leading-none">
                      {currentSensorData?.humidity || 0}%
                    </h3>
                    <span className="text-xl font-bold text-blue-500">{getTrend(currentSensorData?.humidity || 50, 'hum')}</span>
                  </>
                )}
              </div>
              <p className="m-0 text-[12px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1 pr-1">{t('iot_hum')}</p>
            </div>
          </div>

          {/* SOIL MOISTURE */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-7 min-h-[160px] shadow-sm border border-gray-100 dark:border-slate-700 border-t-4 border-t-[#16a34a] flex flex-col justify-between hover-lift">
            <div className="w-14 h-14 bg-green-50 dark:bg-green-900/20 rounded-full flex justify-center items-center font-bold text-xl">
              🌱
            </div>
            <div className="mt-6">
              <div className="min-h-[44px] flex items-center gap-3">
                {isLoading ? <Skeleton className="h-9 w-24" /> : (
                  <>
                    <h3 className="m-0 mb-1 text-[36px] font-black tracking-tighter text-gray-900 dark:text-white leading-none">
                      {currentSensorData?.soil_moisture || 0}%
                    </h3>
                    <span className="text-xl font-bold text-green-500">{getTrend(currentSensorData?.soil_moisture || 50, 'moist')}</span>
                  </>
                )}
              </div>
              <p className="m-0 text-[12px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1 pr-1">{t('iot_moisture')}</p>
            </div>
          </div>

          {/* IRRIGATION */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-7 min-h-[160px] shadow-sm border border-gray-100 dark:border-slate-700 border-t-4 border-t-[#f97316] flex flex-col justify-between hover-lift">
            <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/20 rounded-full flex justify-center items-center font-bold text-xl">
              🚰
            </div>
            <div className="mt-6">
              <div className="min-h-[44px]">
                {isLoading ? <Skeleton className="h-9 w-24" /> : (
                  <h3 className={`m-0 mb-1 text-[36px] font-black tracking-tighter leading-none ${
                    !isPageOnline ? 'text-gray-400' :
                    irrigation?.needed ? "text-red-500" :
                    "text-green-600"
                  }`}>
                    {!isPageOnline ? "---" : (irrigation?.needed ? "ON" : "OFF")}
                  </h3>
                )}
              </div>
              <p className="m-0 text-[12px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1 pr-1">
                {!isPageOnline ? `${t('home_irrigation')} (${t('common_offline')})` : t('home_irrigation')}
              </p>
            </div>
          </div>
        </div>

        {/* 4. FARMER STATS ROW */}
        <div className={`grid gap-4 mt-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 hover-lift">
            <p className="m-0 text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">🌾 Active Crops</p>
            <p className="m-0 text-3xl font-black text-green-600">
              {isLoggedIn ? (() => { try { return JSON.parse(farmer?.active_crops || '[]').length; } catch { return 0; } })() : '--'}
            </p>
            <p className="m-0 text-xs text-gray-400 mt-1 italic">{isLoggedIn ? 'Currently tracked' : 'Login to track'}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 hover-lift">
            <p className="m-0 text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">🗺️ Farm Size</p>
            <p className="m-0 text-3xl font-black text-blue-600">
              {isLoggedIn ? `${farmer?.farm_size || 0}` : '--'}
            </p>
            <p className="m-0 text-xs text-gray-400 mt-1 italic">{isLoggedIn ? `${farmer?.farm_size_unit || 'acres'} • ${farmer?.location || 'India'}` : 'Login to track'}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 hover-lift">
            <p className="m-0 text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">🔬 Disease Scans</p>
            <p className="m-0 text-3xl font-black text-amber-600">
              {isLoggedIn ? (farmer?.total_scans || 0) : '--'}
            </p>
            <p className="m-0 text-xs text-gray-400 mt-1 italic">{isLoggedIn ? 'Total scans done' : 'Login to track'}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 hover-lift">
            <p className="m-0 text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">🤖 AI Chats</p>
            <p className="m-0 text-3xl font-black text-purple-600">
              {isLoggedIn ? (farmer?.total_chats || 0) : '--'}
            </p>
            <p className="m-0 text-xs text-gray-400 mt-1 italic">{isLoggedIn ? 'Questions answered' : 'Login to track'}</p>
          </div>
        </div>
      </section>

      {/* 5. INSIGHTS ROW: REC CROP & QUICK TIPS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 anim-fade-in">
        {/* Recommended Crop Column */}
        <section className="animate-fade-in-up">
          <h2 className="text-xl text-gray-900 dark:text-white mb-6 font-black uppercase tracking-widest text-xs opacity-50 flex items-center gap-2">
            🌱 {t('home_rec_crop')}
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 min-h-[180px] flex flex-col justify-center relative hover-lift transition-all overflow-hidden">
            {!isLoggedIn ? (
              <div className="text-center py-4">
                <p className="text-gray-400 text-sm font-bold mb-4 italic">Login to see AI crop suggestions for your soil.</p>
                <button onClick={() => navigate('/login')} className="text-[#16a34a] font-black text-xs uppercase tracking-widest hover:underline">Login Now →</button>
              </div>
            ) : isRecLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : recommendedCrop ? (
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center text-5xl shadow-sm border border-green-100 dark:border-green-800 text-green-600">
                  {recommendedCrop.emoji}
                </div>
                <div className="flex-1">
                  <h3 className="m-0 text-2xl font-black text-gray-900 dark:text-white mb-2">{recommendedCrop.name}</h3>
                  <p className="m-0 text-gray-500 dark:text-slate-400 text-sm font-medium leading-relaxed italic">
                    "{recommendedCrop.reason}"
                  </p>
                  <div className="flex gap-2 mt-4">
                    <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full border border-blue-100 uppercase tracking-widest">
                      {recommendedCrop.profit_potential} Profit
                    </span>
                    <span className="text-[10px] font-black bg-orange-50 text-orange-600 px-2.5 py-0.5 rounded-full border border-orange-100 uppercase tracking-widest">
                      {recommendedCrop.best_season}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm font-bold italic text-center">Collecting sensor data for recommendation...</p>
            )}
            
            {/* Background Accent */}
            <div className="absolute -bottom-6 -right-6 text-9xl opacity-[0.03] rotate-12 select-none pointer-events-none">
              {recommendedCrop?.emoji || "🌿"}
            </div>
          </div>
        </section>

        {/* Quick Tips Column */}
        <section className="animate-fade-in-up [animation-delay:200ms]">
          <h2 className="text-xl text-gray-900 dark:text-white mb-6 font-black uppercase tracking-widest text-xs opacity-50 flex items-center gap-2">
            💡 QUICK TIPS
          </h2>
          <div className="flex flex-col gap-3">
            {isLoading ? (
              [1, 2].map(i => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 flex items-center gap-4">
                   <div className="w-10 h-10 bg-gray-100 dark:bg-slate-700 rounded-lg animate-pulse" />
                   <Skeleton className="h-4 w-full" />
                </div>
              ))
            ) : (
              getDynamicTips(
                sensorData?.temperature || 25, 
                sensorData?.humidity || 50, 
                sensorData?.soil_moisture || 50, 
                weatherData?.condition || "Sunny"
              ).slice(0, 3).map((tip, idx) => {
                const colors: any = { warning: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200", good: "text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200", info: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200" };
                return (
                  <div key={idx} className={`bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 flex items-center gap-4 hover-lift transition-all animate-slide-in-right`} style={{ animationDelay: `${idx * 150}ms` }}>
                    <div className={`w-10 h-10 rounded-lg flex justify-center items-center flex-shrink-0 text-xl border ${colors[tip.type]}`}>
                      {tip.icon}
                    </div>
                    <p className="m-0 text-gray-600 dark:text-slate-300 text-sm font-bold truncate">
                      {tip.text}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

    </div>
  );
}

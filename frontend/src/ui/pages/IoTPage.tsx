import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { useSensor } from '../../context/SensorContext';
import SpeakButton from '../../components/SpeakButton';

// --- HELPER: COUNT UP ANIMATION ---
const CountUp = ({ end, duration = 1500, decimals = 0 }: { end: number, duration?: number, decimals?: number }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);
  return <span>{count.toFixed(decimals)}</span>;
};

interface SensorData {
  temperature: number | null;
  humidity: number | null;
  soil_moisture: number | null;
  timestamp: string | null;
}

// --- HELPER: SKELETON CARD ---
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="w-12 h-12 bg-gray-200 rounded-full" />
      <div className="w-20 h-6 bg-gray-200 rounded-full" />
    </div>
    <div className="w-24 h-10 bg-gray-200 rounded mb-2" />
    <div className="w-32 h-4 bg-gray-100 rounded mb-6" />
    <div className="flex gap-1 mb-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="w-full h-2 bg-gray-100 rounded-full" />
      ))}
    </div>
    <div className="w-40 h-3 bg-gray-50 rounded" />
  </div>
);

// --- HELPER: DOT INDICATORS ---
const DotIndicators = ({ value, min, max, activeColor }: { value: number | null, min: number, max: number, activeColor: string }) => {
  if (value === null) return (
    <div className="flex gap-1.5 my-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex-1 h-1.5 bg-gray-100 rounded-full" />
      ))}
    </div>
  );

  // Calculate how many dots to fill based on a reasonable range
  // We'll normalize the value to 1-5 dots
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const activeDots = Math.ceil((percentage / 100) * 5);

  return (
    <div className="flex gap-1.5 my-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div 
          key={i} 
          className={`flex-1 h-1.5 rounded-full transition-colors duration-500 ${i <= activeDots ? activeColor : 'bg-gray-100'}`}
        />
      ))}
    </div>
  );
};

export default function IoTPage({ lang }: { lang: string }) {
  const navigate = useNavigate();
  const { t } = useTranslation(lang);
  const { temperature, humidity, soil_moisture, timestamp, isOnline, lastUpdateDate, clearSensorData, refreshSensorData } = useSensor();
  
  // Create a compatible sensorData object for the existing code
  const sensorData = temperature !== null ? { temperature, humidity, soil_moisture, timestamp } : null;
  const isLoading = temperature === null;
  const isStale = sensorData !== null && !isOnline;
  const minsAgo = lastUpdateDate ? Math.floor((Date.now() - lastUpdateDate) / 60000) : 0;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshSensorData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const [overrideDuration, setOverrideDuration] = useState(60);
  const [isSendingOverride, setIsSendingOverride] = useState(false);

  const handleOverride = async (command: string) => {
    setIsSendingOverride(true);
    try {
      if (command === "AUTO") {
        await fetch('/api/v1/iot/override', { method: 'DELETE' });
      } else {
        await fetch('/api/v1/iot/override', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command, duration_minutes: overrideDuration })
        });
      }
      setTimeout(() => handleRefresh(), 800); // refresh UI to pull new override state
    } catch (e) {
      console.error(e);
    }
    setIsSendingOverride(false);
  };

  // Connectivity display string
  const lastUpdateStr = timestamp || "Never";

  // --- LOGIC: AUTO-CLEAR AFTER 10 MINUTES ---
  useEffect(() => {
    if (!lastUpdateDate) return;
    const checkStaleData = setInterval(() => {
      if (Date.now() - lastUpdateDate > 600000) {
        clearSensorData();
      }
    }, 1000);
    return () => clearInterval(checkStaleData);
  }, [lastUpdateDate, clearSensorData]);

  const isTempOnline = Boolean(isOnline && sensorData?.temperature != null && sensorData.temperature !== -999 && sensorData.temperature >= 0 && sensorData.temperature <= 60);
  const isHumOnline  = Boolean(isOnline && sensorData?.humidity     != null && sensorData.humidity     !== -999 && sensorData.humidity     >= 0 && sensorData.humidity     <= 100);
  const isSoilOnline = Boolean(isOnline && sensorData?.soil_moisture != null && sensorData.soil_moisture !== -999 && sensorData.soil_moisture >= 0 && sensorData.soil_moisture <= 100);

  // --- BADGE HELPERS ---
  const getTempBadge = (temp: number | null) => {
    if (temp === null || temp === -999) return <span className="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full border border-red-100">{t('iot_badge_disconnected')}</span>;
    if (temp < 15) return <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-100">{t('iot_badge_cold')}</span>;
    if (temp > 35) return <span className="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full border border-red-100">{t('iot_badge_hot')}</span>;
    return <span className="bg-green-50 text-green-600 text-xs font-bold px-2.5 py-1 rounded-full border border-green-100">{t('iot_badge_optimal')}</span>;
  };

  const getHumidityBadge = (hum: number | null) => {
    if (hum === null || hum === -999) return <span className="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full border border-red-100">{t('iot_badge_disconnected')}</span>;
    if (hum < 30) return <span className="bg-orange-50 text-orange-600 text-xs font-bold px-2.5 py-1 rounded-full border border-orange-100">{t('iot_badge_dry')}</span>;
    if (hum > 70) return <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-100">{t('iot_badge_humid')}</span>;
    return <span className="bg-green-50 text-green-600 text-xs font-bold px-2.5 py-1 rounded-full border border-green-100">{t('iot_badge_optimal')}</span>;
  };

  const getMoistureBadge = (moist: number | null) => {
    if (moist === null) return null;
    if (moist === -999) return <span className="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full border border-red-100">{t('iot_badge_disconnected')}</span>;
    if (moist < 30) return <span className="bg-orange-50 text-orange-600 text-xs font-bold px-2.5 py-1 rounded-full border border-orange-100">{t('iot_badge_dry')}</span>;
    if (moist > 60) return <span className="bg-teal-50 text-teal-600 text-xs font-bold px-2.5 py-1 rounded-full border border-teal-100">{t('iot_badge_waterlogged')}</span>;
    return <span className="bg-green-50 text-green-600 text-xs font-bold px-2.5 py-1 rounded-full border border-green-100">{t('iot_badge_optimal')}</span>;
  };

  const renderIrrigationCard = () => {
    const moist = sensorData?.soil_moisture;
    if (moist === null || moist === undefined) return null;

    // ESP32 is offline — don't show irrigation commands based on stale data
    if (!isOnline) {
      return (
        <div className="mt-4 p-8 rounded-3xl border-2 border-gray-200 bg-gray-50 text-gray-600 animate-fade-in-up">
          <div className="flex items-center gap-4">
            <span className="text-4xl">📡</span>
            <div>
              <h2 className="text-2xl font-black mb-1 m-0 text-gray-700">{t('iot_esp_offline_title')}</h2>
              <p className="m-0 text-sm font-bold uppercase tracking-widest opacity-60">
                {isStale ? `${t('iot_status_stale')} — ${minsAgo} min ago` : t('iot_esp_offline_desc')}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Soil sensor disconnected — show a fault card instead
    if (moist === -999) {
      return (
        <div className="mt-4 p-8 rounded-3xl border-2 border-red-200 bg-red-50 text-red-900 animate-fade-in-up">
          <div className="flex items-center gap-4">
            <span className="text-4xl">⚠️</span>
            <div>
              <h2 className="text-2xl font-black mb-1 m-0">{t('iot_soil_disconnected_title')}</h2>
              <p className="m-0 text-sm opacity-70 font-bold uppercase tracking-widest">{t('iot_soil_disconnected_desc')}</p>
            </div>
          </div>
        </div>
      );
    }

    let bg = "bg-white border-gray-100";
    let status = "OFF";
    let message = "No irrigation needed";
    let icon = "🚿";

    // AI-like synchronized sentences
    if (moist < 30) {
      bg = "bg-red-50 border-red-200 text-red-900";
      status = "ON";
      message = t('iot_msg_low', { moist });
      icon = "⚠️";
    } else if (moist <= 60) {
      bg = "bg-orange-50 border-orange-200 text-orange-900";
      status = "MODERATE";
      message = t('iot_msg_moderate', { moist });
      icon = "💧";
    } else {
      bg = "bg-green-50 border-green-200 text-green-900";
      status = "OFF";
      message = t('iot_msg_optimal', { moist });
      icon = "✅";
    }

    return (
      <div className={`mt-4 p-8 rounded-3xl border-2 transition-all duration-500 shadow-sm animate-fade-in-up hover-lift ${bg}`}>
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{icon}</span>
            <div>
              <h2 className="text-2xl font-black mb-1 m-0">{t('home_irrigation').toUpperCase()}: {status}</h2>
              <p className="m-0 text-sm opacity-70 font-bold uppercase tracking-widest text-[#16a34a] flex items-center gap-1.5"><span className="text-base">🤖</span> Local AI Analysis Engine</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/chat', { state: { prefill: `Soil moisture is ${moist}%. Should I change my irrigation schedule?` } })}
            className="bg-white/50 backdrop-blur-sm border-2 border-current px-5 py-2.5 rounded-xl text-sm font-black transition-all hover:bg-white hover:shadow-md ripple"
          >
            🤖 {t('crops_ask_expert')} →
          </button>
        </div>

        <div className="mt-6 p-5 bg-white/40 backdrop-blur-md rounded-2xl border border-white/50 text-[17px] font-bold text-gray-800 leading-relaxed italic shadow-sm">
          "{message}"
        </div>


      </div>
    );
  };



  return (
    <div className="pb-20 font-sans text-gray-900">
      <style>{`
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(22, 163, 74, 0); }
          100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
        }
        .pulse-dot {
          animation: pulse-green 2s infinite;
        }
      `}</style>

      {/* HEADER */}
      <section className="bg-[#15803d] rounded-2xl p-8 md:p-10 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl md:text-4xl font-extrabold m-0">📡 {t('iot_title')}</h1>
            {isOnline ? (
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                <div className="w-2.5 h-2.5 bg-green-400 rounded-full pulse-dot" />
                <span>{t('common_online')}</span>
              </div>
            ) : isStale ? (
              <div className="flex items-center gap-2 bg-orange-500/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm text-orange-200">
                <div className="w-2.5 h-2.5 bg-orange-400 rounded-full" />
                <span>{t('iot_status_stale').toUpperCase()}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                <div className="w-2.5 h-2.5 bg-gray-400 rounded-full" />
                <span>{t('iot_status_waiting').toUpperCase()}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center text-white/80 text-lg m-0 mt-2">
            <p className="m-0">{isOnline ? "ESP32 Connected — Live" : isStale ? "ESP32 Disconnected — Showing last data" : "Waiting for ESP32..."}</p>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleRefresh}
                className={`bg-white/20 hover:bg-white/30 text-white text-xs px-4 py-2 rounded-xl font-bold transition-all shadow-sm active:scale-95 flex items-center gap-2 ${isRefreshing ? 'opacity-70 cursor-wait' : ''}`}
                disabled={isRefreshing}
              >
                <span className={`text-[10px] ${isRefreshing ? 'animate-spin' : ''}`}>⟳</span> {t('common_retry')}
              </button>
              
              {isStale && (
                <button 
                  onClick={clearSensorData}
                  className="bg-white/20 hover:bg-white/30 text-white text-xs px-4 py-2 rounded-xl font-bold transition-all shadow-sm active:scale-95"
                >
                  {t('common_cancel')}
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
      </section>

      {/* SENSOR CARDS */}
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <span className="text-green-600">📊</span> {t('home_sensor_data')}
      </h2>
      {isLoading && !sensorData ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 transition-all duration-500 ${isStale ? 'opacity-60 saturate-50 sepia-[.2]' : ''}`}>
          
          {/* TEMPERATURE CARD */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col border-t-4 border-t-red-500 relative hover-lift animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-2xl shadow-inner">
                🌡️
              </div>
              {getTempBadge(sensorData?.temperature || null)}
            </div>
            <h3 className="m-0 text-4xl font-black text-gray-900">
              {sensorData?.temperature !== undefined && sensorData?.temperature !== null ? <CountUp end={sensorData.temperature} decimals={1} /> : "--"}°C
            </h3>
            <p className="text-gray-500 font-bold text-sm mb-4 uppercase tracking-wider">{t('iot_temp')}</p>
            
            <DotIndicators value={sensorData?.temperature || null} min={0} max={50} activeColor="bg-red-500" />
            
            <p className="text-xs text-gray-400 m-0 italic">Optimal range: 15-35°C</p>
          </div>

          {/* HUMIDITY CARD */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col border-t-4 border-t-blue-500 relative hover-lift animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-2xl shadow-inner">
                💧
              </div>
              {getHumidityBadge(sensorData?.humidity || null)}
            </div>
            <h3 className="m-0 text-4xl font-black text-gray-900">
              {sensorData?.humidity !== undefined && sensorData?.humidity !== null ? <CountUp end={sensorData.humidity} /> : "--"}%
            </h3>
            <p className="text-gray-500 font-bold text-sm mb-4 uppercase tracking-wider">{t('iot_hum')}</p>
            
            <DotIndicators value={sensorData?.humidity || null} min={0} max={100} activeColor="bg-blue-500" />
            
            <p className="text-xs text-gray-400 m-0 italic">Optimal range: 30-70%</p>
          </div>

          {/* SOIL MOISTURE CARD */}
          <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col border-t-4 relative hover-lift animate-fade-in-up ${sensorData?.soil_moisture === -999 ? 'border-t-red-400 opacity-60' : 'border-t-green-500'}`} style={{ animationDelay: '0.5s' }}>
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-inner ${sensorData?.soil_moisture === -999 ? 'bg-red-50' : 'bg-green-50'}`}>
                🌱
              </div>
              {getMoistureBadge(sensorData?.soil_moisture ?? null)}
            </div>
            <h3 className="m-0 text-4xl font-black text-gray-900 flex items-center gap-3">
              {sensorData?.soil_moisture !== undefined && sensorData?.soil_moisture !== null && sensorData.soil_moisture !== -999 ? <CountUp end={sensorData.soil_moisture} /> : "--"}%
              {sensorData?.soil_moisture !== undefined && sensorData?.soil_moisture !== null && sensorData.soil_moisture !== -999 && (
                <SpeakButton 
                  text={`Your soil moisture is ${sensorData.soil_moisture} percent. ${sensorData.soil_moisture < 30 ? 'It is too dry. Please water your crops.' : sensorData.soil_moisture > 60 ? 'It is waterlogged. Please check drainage.' : 'Conditions are optimal.'}`} 
                  lang={lang.toUpperCase()} 
                />
              )}
            </h3>
            <p className="text-gray-500 font-bold text-sm mb-4 uppercase tracking-wider">{t('iot_moisture')}</p>
            
            <DotIndicators value={sensorData?.soil_moisture === -999 ? null : (sensorData?.soil_moisture ?? null)} min={0} max={100} activeColor="bg-green-500" />
            
            {sensorData?.soil_moisture === -999 ? (
              <p className="text-xs text-red-500 m-0 font-bold">⚠️ Sensor disconnected — check wire</p>
            ) : (
              <p className="text-xs text-gray-400 m-0 italic">Optimal range: 30-60%</p>
            )}
          </div>
        </div>
      )}

      <div className="text-sm text-gray-400 mb-10 flex items-center justify-center gap-2 bg-gray-50 py-2 rounded-full border border-gray-100 max-w-fit mx-auto px-6">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
        {t('iot_last_update')}: <strong className="text-gray-600 ml-1">{isStale ? `${lastUpdateStr} (${minsAgo} minutes ago)` : lastUpdateStr}</strong>
      </div>

      {/* IRRIGATION STATUS */}
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span>🚿</span> {t('home_irrigation')}
      </h2>
      {renderIrrigationCard()}

      {/* MANUAL PUMP CONTROLS */}
      <div className="mt-8 bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
        <h3 className="font-bold mb-4 flex items-center gap-2">🕹️ {t('iot_manual_controls')}</h3>
        <p className="text-sm text-gray-500 mb-6">Remotely override autonomous AI decisions. Safety sensors will automatically turn off the pump if moisture reaches 60%.</p>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
            <span className="text-sm font-bold text-gray-600 px-2">{t('iot_timer')}:</span>
            <input 
              type="number" 
              value={overrideDuration} 
              onChange={(e) => setOverrideDuration(Number(e.target.value))}
              className="w-20 px-3 py-1.5 rounded-lg border border-gray-300 text-center font-bold"
              min="1" max="180"
            />
            <span className="text-sm font-bold text-gray-600 px-2">{t('iot_minutes')}</span>
          </div>

          <button 
            onClick={() => handleOverride('ON')}
            disabled={isSendingOverride}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {t('iot_pump_on')}
          </button>
          
          <button 
            onClick={() => handleOverride('OFF')}
            disabled={isSendingOverride}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {t('iot_pump_off')}
          </button>
          
          <button 
            onClick={() => handleOverride('AUTO')}
            disabled={isSendingOverride}
            className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {t('iot_auto_mode')}
          </button>
        </div>
      </div>

      {/* SENSOR HEALTH */}
      <h2 className="text-xl font-bold mb-6 mt-12 flex items-center gap-2">
        <span>🔧</span> {t('iot_sensor_health')}
      </h2>
      <div className="flex flex-wrap gap-4">
        <div className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 font-bold transition-all transition-700 shadow-sm
          ${isOnline && isTempOnline ? 'bg-green-50 border-green-200 text-green-700' : isStale ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
          <span>🌡️</span> {t('iot_temp')}: {isOnline && isTempOnline ? t('common_online') : isStale ? `${t('iot_status_stale')} ${minsAgo}m ago` : t('iot_status_waiting')}
        </div>
        <div className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 font-bold transition-all transition-700 shadow-sm
          ${isOnline && isHumOnline ? 'bg-green-50 border-green-200 text-green-700' : isStale ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
          <span>💧</span> {t('iot_hum')}: {isOnline && isHumOnline ? t('common_online') : isStale ? `${t('iot_status_stale')} ${minsAgo}m ago` : t('iot_status_waiting')}
        </div>
        <div className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 font-bold transition-all transition-700 shadow-sm
          ${isOnline && isSoilOnline ? 'bg-green-50 border-green-200 text-green-700' : isOnline && sensorData?.soil_moisture === -999 ? 'bg-red-50 border-red-200 text-red-700' : isStale ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
          <span>🌱</span> {t('iot_moisture')}: {isOnline && isSoilOnline ? t('common_online') : isOnline && sensorData?.soil_moisture === -999 ? `⚠️ ${t('iot_badge_disconnected')}` : isStale ? `${t('iot_status_stale')} ${minsAgo}m ago` : t('iot_status_waiting')}
        </div>
      </div>

      <footer className="mt-16 text-center border-t border-gray-100 pt-8">
        <p className="text-gray-400 italic text-sm">
          Connect ESP32 hardware to get real sensor readings from your farm.
        </p>
      </footer>
    </div>
  );
}

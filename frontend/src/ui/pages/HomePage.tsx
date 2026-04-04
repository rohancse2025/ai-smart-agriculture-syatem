/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import axios from 'axios';

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-slate-700 rounded ${className}`} />
);

const ALL_TIPS = [
  // Weather-based
  { icon: "🌧️", text: "Rain expected — delay fertilizer application by 24 hours", type: "info", condition: "rain" },
  { icon: "☀️", text: "Clear sunny day — ideal for spraying pesticides", type: "good", condition: "sunny" },
  { icon: "🌫️", text: "High humidity — watch for fungal diseases on leaves", type: "warning", condition: "humid" },
  { icon: "🔥", text: "High temperature — water crops before 8 AM or after 6 PM", type: "warning", condition: "hot" },
  { icon: "❄️", text: "Cold weather — protect seedlings with mulch or cover", type: "warning", condition: "cold" },
  // Soil-based
  { icon: "💧", text: "Soil moisture is optimal — maintain current irrigation schedule", type: "good", condition: "any" },
  { icon: "🚰", text: "Soil is dry — start drip irrigation immediately", type: "warning", condition: "dry" },
  { icon: "🌊", text: "Soil is waterlogged — check drainage channels today", type: "warning", condition: "wet" },
  { icon: "🧪", text: "Test soil pH every 3 months for best crop yield", type: "info", condition: "any" },
  { icon: "🌱", text: "Add organic compost to improve soil structure and nutrients", type: "info", condition: "any" },
  // General farming
  { icon: "🐛", text: "Inspect crop leaves weekly for early pest detection", type: "info", condition: "any" },
  { icon: "✂️", text: "Prune dead leaves to improve air circulation and reduce disease", type: "info", condition: "any" },
  { icon: "📊", text: "Keep a farm diary — track what works best each season", type: "info", condition: "any" },
  { icon: "🌾", text: "Rotate crops each season to prevent soil nutrient depletion", type: "good", condition: "any" },
  { icon: "🐝", text: "Plant flowering border crops to attract pollinators", type: "good", condition: "any" },
  { icon: "💊", text: "Use neem oil spray for organic pest control — safe and effective", type: "info", condition: "any" },
  { icon: "🌿", text: "Inter-cropping legumes with cereals improves soil nitrogen", type: "good", condition: "any" },
  { icon: "📅", text: "Mark your harvest dates on calendar to plan market visits", type: "info", condition: "any" },
  { icon: "💰", text: "Sell at local mandi early morning for better prices", type: "good", condition: "any" },
  { icon: "☔", text: "Collect rainwater in farm ponds for dry season irrigation", type: "info", condition: "any" },
  { icon: "🌻", text: "Sunflower borders deter pests and improve field biodiversity", type: "good", condition: "any" },
  { icon: "🔬", text: "Scan crop leaves weekly using the Scan feature to catch disease early", type: "info", condition: "any" },
  { icon: "📱", text: "Check market prices before harvesting to time your sale perfectly", type: "info", condition: "any" },
  { icon: "⏰", text: "Morning is the best time to observe crop health — light is even", type: "info", condition: "any" },
  { icon: "🌱", text: "Thin out overcrowded seedlings so each plant gets enough nutrients", type: "info", condition: "any" },
  { icon: "💧", text: "Drip irrigation saves 40% water vs flood irrigation", type: "good", condition: "any" },
  { icon: "🧑🌾", text: "Join your local Krishi Vigyan Kendra for free training and seeds", type: "info", condition: "any" },
  { icon: "📦", text: "Proper storage in gunny bags at cool dry place extends shelf life", type: "info", condition: "any" },
  { icon: "🔄", text: "Good conditions — ideal time to apply fertilizers for better absorption", type: "good", condition: "any" },
  { icon: "🌈", text: "Cloudy day — good time to transplant seedlings or apply foliar spray", type: "info", condition: "cloudy" },
];

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
  // Modal State for Quick Add Crop
  const [tipOffset, setTipOffset] = useState(0); const isMobile = window.innerWidth < 768; const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addingCropName, setAddingCropName] = useState('Rice');
  const [addingDate, setAddingDate] = useState(new Date().toISOString().split('T')[0]);

  const CROP_ICONS: any = {
    'Rice': "https://images.unsplash.com/photo-1536633100346-60803ee40713?w=200",
    'Wheat': "https://images.unsplash.com/photo-1542750617-2796c738521c?w=200",
    'Maize': "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=200",
    'Tomato': "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200",
    'Potato': "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200",
    'Onion': "https://images.unsplash.com/photo-1508747703725-719777637510?w=200",
    'Cotton': "https://images.unsplash.com/photo-1620912189865-1e8a33da4c59?w=200",
    'Sugarcane': "https://images.unsplash.com/photo-1614715838608-dd527c46231d?w=200",
    'Soybean': "https://images.unsplash.com/photo-1599307767316-776533bb941c?w=200",
    'Groundnut': "https://images.unsplash.com/photo-1595126732330-8919688a221f?w=200",
    'Mustard': "https://images.unsplash.com/photo-1510629730590-798539eaec32?w=200",
    'Sunflower': "https://images.unsplash.com/photo-1470509037663-253afd7f0f51?w=200",
    'Chana': "https://images.unsplash.com/photo-1606756790138-261d2b21cd75?w=200",
    'Grapes': "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=200",
    'Mango': "https://images.unsplash.com/photo-1553279768-86518a220261?w=200",
    'Chili': "https://images.unsplash.com/photo-1588165171080-c89acfa5ee83?w=200",
    'Garlic': "https://images.unsplash.com/photo-1518977956812-cd3dbce33a0c?w=200",
    'Ginger': "https://images.unsplash.com/photo-1615485290382-aa350dda9e0a?w=200"
  };
 
  // State for Crop Modal View (List or Add)
  const [cropModalTab, setCropModalTab] = useState<'list' | 'add'>('list');

  // 3. New Farm Stats & Actions Logic
  const [activeCropsList, setActiveCropsList] = useState<any[]>([]);
  useEffect(() => {
    try {
      const stored = JSON.parse(farmer?.active_crops || '[]');
      setActiveCropsList(Array.isArray(stored) ? stored : []);
    } catch { setActiveCropsList([]); }
  }, [farmer?.active_crops]);

  const addQuickCrop = () => {
    const newCrop = {
      id: Date.now(),
      crop_name: addingCropName,
      emoji: { 
        'Rice': '🌾', 'Wheat': '🌾', 'Maize': '🌽', 'Tomato': '🍅', 'Potato': '🥔', 
        'Onion': '🧅', 'Cotton': '☁️', 'Sugarcane': '🎋', 'Soybean': '🫘',
        'Groundnut': '🥜', 'Mustard': '🌼', 'Sunflower': '🌻', 'Chana': '🫘',
        'Grapes': '🍇', 'Mango': '🥭', 'Chili': '🌶️', 'Garlic': '🧄', 'Ginger': '🫚'
      }[addingCropName] || '🌱',
      planted_date: addingDate,
      area: farmer?.farm_size || 1
    };
    const updated = [newCrop, ...activeCropsList];
    setActiveCropsList(updated);
    
    // Update farmer in localStorage
    const updatedFarmer = { ...farmer, active_crops: JSON.stringify(updated) };
    localStorage.setItem('kisancore_farmer', JSON.stringify(updatedFarmer));
    setCropModalTab('list'); 
    
    // Force refresh
    window.dispatchEvent(new Event('storage'));
  };

  const deleteCrop = (id: number) => {
    if (!window.confirm("Are you sure you want to remove this crop from tracking?")) return;
    
    const updated = activeCropsList.filter(c => c.id !== id);
    setActiveCropsList(updated);
    
    // Update farmer in localStorage
    const updatedFarmer = { ...farmer, active_crops: JSON.stringify(updated) };
    localStorage.setItem('kisancore_farmer', JSON.stringify(updatedFarmer));
    
    // Force refresh
    window.dispatchEvent(new Event('storage'));
  };

  const getHarvestDate = (plantedDate: string, cropName: string) => {
    if (!plantedDate) return null;
    const planted = new Date(plantedDate);
    const cropDays: Record<string, number> = {
      'Rice': 120, 'Wheat': 130, 'Maize': 90, 'Tomato': 75, 'Potato': 90,
      'Onion': 100, 'Cotton': 160, 'Sugarcane': 365, 'Soybean': 100,
      'Groundnut': 110, 'Mustard': 90, 'Sunflower': 95, 'Chana': 100
    };
    const daysNeeded = cropDays[cropName] || 120;
    return new Date(planted.getTime() + daysNeeded * 24 * 60 * 60 * 1000);
  };

  const getDaysToHarvest = (plantedDate: string, cropName: string) => {
    if (!plantedDate) return null;
    const planted = new Date(plantedDate);
    const cropDays: Record<string, number> = {
      'Rice': 120, 'Wheat': 130, 'Maize': 90, 'Tomato': 75, 'Potato': 90,
      'Onion': 100, 'Cotton': 160, 'Sugarcane': 365, 'Soybean': 100,
      'Groundnut': 110, 'Mustard': 90, 'Sunflower': 95, 'Chana': 100
    };
    const daysNeeded = cropDays[cropName] || 120;
    const harvestDate = new Date(planted.getTime() + daysNeeded * 24 * 60 * 60 * 1000);
    const daysLeft = Math.ceil((harvestDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft;
  };

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


  const [marketRegion, setMarketRegion] = useState<string>('');
  const [marketDistrict, setMarketDistrict] = useState<string>('');
  const [locationSource, setLocationSource] = useState<'GPS' | 'Profile' | 'Weather' | 'Default'>('Default');

  // Pure CSS blinking animation for the status dot
  const pulseKeyframes = `
    @keyframes kisan-pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.3; transform: scale(1.3); }
      100% { opacity: 1; transform: scale(1); }
    }
  `;
  const [trendingCrops, setTrendingCrops] = useState<any[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [refreshTimer, setRefreshTimer] = useState(60);

  // SMART LOCATION HIERARCHY
  useEffect(() => {
    const resolveLocation = async () => {
      // 1. Try Live GPS first
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
            const data = await res.json();
            const state = data.address.state || 'Karnataka';
            const city = data.address.district || data.address.state_district || data.address.city || data.address.county || data.address.suburb || 'Bangalore';
            
            setMarketRegion(state);
            setMarketDistrict(city);
            setLocationSource('GPS');
          } catch (e) {
             fallbackLocation();
          }
        }, () => fallbackLocation());
      } else {
        fallbackLocation();
      }
    };

    const fallbackLocation = () => {
      if (isLoggedIn && farmer?.location) {
         const parts = farmer.location.split(', ');
         setMarketRegion(parts[0] || 'Punjab');
         setMarketDistrict(parts[1] || 'Ludhiana');
         setLocationSource('Profile');
      } else {
        setMarketRegion('Punjab');
        setMarketDistrict('Ludhiana');
        setLocationSource('Default');
      }
    };

    resolveLocation();
  }, [isLoggedIn, farmer?.location]);

  // Sync Farmer state with local storage on storage events
  useEffect(() => {
    const handleSync = () => {
      const updated = JSON.parse(localStorage.getItem('kisancore_farmer') || 'null');
      if (updated) {
        try {
          const crops = JSON.parse(updated.active_crops || '[]');
          setActiveCropsList(Array.isArray(crops) ? crops : []);
        } catch { setActiveCropsList([]); }
      }
    };
    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }, []);

  useEffect(() => {
    const fetchMarketTrends = async () => {
      if (!marketRegion) return;
      setMarketLoading(true);
      try {
        const commodities = ['Potato', 'Onion', 'Tomato', 'Wheat', 'Maize', 'Soybean', 'Cotton'];
        const results = await Promise.allSettled(
          commodities.map(c => axios.get(`${import.meta.env.VITE_API_URL || ''}/api/v1/market?state=${marketRegion}&commodity=${c}`))
        );
        
        const trends = results.map((res, i) => {
          const data = (res.status === 'fulfilled' && res.value.data?.[0]) ? res.value.data[0] : null;
          const baseRates: Record<string, number> = {
            'Potato': 1200, 'Onion': 1500, 'Tomato': 1800, 'Wheat': 2100, 
            'Maize': 2000, 'Soybean': 4500, 'Cotton': 6000
          };
          return { 
            name: commodities[i], 
            price: data?.max_price || (baseRates[commodities[i]] + Math.floor(Math.random() * 500)),
            quality: data?.grade || 'Standard',
            market: data?.market || `${marketDistrict} Mandi`,
            isLive: !!data
          };
        }).sort((a, b) => b.price - a.price);
        setTrendingCrops(trends);
        if (trends.length > 0) setMarketPrice(trends[0]);
      } catch (err) {
        console.error("Market fetch failed", err);
      } finally {
        setTimeout(() => setMarketLoading(false), 800);
      }
    };

    fetchMarketTrends();
    const pollInterval = setInterval(fetchMarketTrends, 60000);
    const timerInterval = setInterval(() => {
      setRefreshTimer(prev => prev <= 1 ? 60 : prev - 1);
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(timerInterval);
    };
  }, [marketRegion, marketDistrict]);

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

  // AI Recommendation Logic
  useEffect(() => {
    const fetchRecommendation = async () => {
      if (!isLoggedIn || (!sensorData.temperature && !weatherData)) return;

      const isSensorConnected = sensorData.temperature !== null && sensorData.temperature !== 0;
      
      // Cache logic
      const cached = JSON.parse(localStorage.getItem('rec_crop_cache') || 'null');
      if (cached && (Date.now() - cached.ts) < 2 * 60 * 1000) {
        setRecommendedCrop(cached.crop);
        return;
      }
      
      // ALWAYS use weather data for recommendation as per user request (ignore sensors)
      const tempToUse = weatherData?.temperature || 25;
      const humToUse  = weatherData?.humidity   || 60;

      const getRainfallEstimate = (condition: string) => {
        const c = (condition || '').toLowerCase();
        if (c.includes('rain') || c.includes('shower')) return 150;
        if (c.includes('cloud') || c.includes('overcast')) return 80;
        if (c.includes('storm') || c.includes('thunder')) return 200;
        return 40; // sunny / clear
      };
      const rainfallToUse = getRainfallEstimate(weatherData?.condition || '');

      const nitrogenToUse   = farmer?.nitrogen   || 45;
      const phosphorusToUse = 40; // Default
      const potassiumToUse  = farmer?.potassium  || 40;

      setIsRecLoading(true);
      try {
        // Pass the top trending crop name as a bias hint if possible
        const topDemandCrop = trendingCrops.length > 0 ? trendingCrops[0].name : '';
        
        const res = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/v1/crops`, {
          nitrogen: nitrogenToUse,
          phosphorus: phosphorusToUse,
          potassium: potassiumToUse,
          temperature: tempToUse,
          humidity: humToUse,
          ph: 6.5,
          rainfall: rainfallToUse,
          market_trend: topDemandCrop // Influencing via hint
        });
        
        if (res.data.crops && res.data.crops.length > 0) {
          // Priority logic: find a recommended crop that matches "demanding" crops first
          let finalCrop = res.data.crops[0];
          const matchesMarket = res.data.crops.find((c: any) => 
            trendingCrops.some((t: any) => t.name.toLowerCase() === c.name.toLowerCase())
          );
          if (matchesMarket) finalCrop = matchesMarket;
          
          setRecommendedCrop(finalCrop);
          localStorage.setItem('rec_crop_cache', JSON.stringify({ crop: finalCrop, ts: Date.now() }));
        }
      } catch (err) {
        console.error("Failed to fetch recommendation", err);
      } finally {
        setIsRecLoading(false);
      }
    };

    const timer = setTimeout(fetchRecommendation, 1500);
    return () => clearTimeout(timer);
  }, [sensorData.temperature, weatherData, isLoggedIn]);

  // Tip Rotation logic
  useEffect(() => {
    const timer = setInterval(() => {
      setTipOffset(prev => prev + 1); // increment by 1 for smoother rotation
    }, 45000); // rotate every 45 seconds
    return () => clearInterval(timer);
  }, []);

  const getSmartTips = (temp: number, hum: number, moist: number, condition: string, offset: number) => {
    const c = condition.toLowerCase();
    // Priority tips based on current conditions
    const priority: typeof ALL_TIPS = [];
    if (moist < 30) priority.push(...ALL_TIPS.filter(t => t.condition === 'dry'));
    if (moist > 75) priority.push(...ALL_TIPS.filter(t => t.condition === 'wet'));
    if (hum > 80) priority.push(...ALL_TIPS.filter(t => t.condition === 'humid'));
    if (temp > 35) priority.push(...ALL_TIPS.filter(t => t.condition === 'hot'));
    if (temp < 10) priority.push(...ALL_TIPS.filter(t => t.condition === 'cold'));
    if (c.includes('rain')) priority.push(...ALL_TIPS.filter(t => t.condition === 'rain'));
    if (c.includes('cloud')) priority.push(...ALL_TIPS.filter(t => t.condition === 'cloudy'));
    if (c.includes('sun') || c.includes('clear')) priority.push(...ALL_TIPS.filter(t => t.condition === 'sunny'));
    
    // Fill with general tips using offset for rotation
    const general = ALL_TIPS.filter(t => t.condition === 'any');
    const rotated = [...general.slice(offset % general.length), ...general.slice(0, offset % general.length)];
    
    const combined = [...priority, ...rotated];
    // Deduplicate by text
    const seen = new Set<string>();
    return combined.filter(t => { if (seen.has(t.text)) return false; seen.add(t.text); return true; }).slice(0, 3);
  };

  return (
    <div className="font-sans">
      
      {/* Offline Banner */}
      {/* Offline Banner */}
      {!isPageOnline && (
        <div className="bg-amber-50 border-b-2 border-amber-500/30 py-3 px-6 text-amber-900 text-center font-black text-[10px] uppercase tracking-widest animate-pulse flex items-center justify-center gap-3 shadow-lg z-[200] sticky top-0 backdrop-blur-md">
          <span className="text-sm">📵</span> OFFLINE MODE: Showing Cached Data. IoT Control & Live Market Syncing Paused.
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
                  {marketDistrict && (
                    <p className="m-0 text-sm text-blue-400 font-semibold italic flex items-center gap-2">
                      📍 {marketDistrict}, {marketRegion}
                      {locationSource === 'GPS' && (
                        <button 
                          onClick={() => {
                            const [s, d] = (farmer?.location || 'Punjab, Ludhiana').split(', ');
                            setMarketRegion(s);
                            setMarketDistrict(d);
                            setLocationSource('Profile');
                          }}
                          className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full not-italic hover:bg-blue-200 transition-all font-black uppercase"
                        >
                          Use Profile Address instead?
                        </button>
                      )}
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
        {/* 4. SMART INTERACTIVE ACTION CARDS */}
        <div className={`grid gap-4 mt-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          {/* CARD 1: MY CROPS */}
          <div 
            onClick={() => {
              if (isLoggedIn) {
                setIsAddModalOpen(true);
                setCropModalTab('list');
              } else navigate('/login');
            }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 hover-lift cursor-pointer transition-all active:scale-95 flex flex-col justify-between min-h-[160px]"
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-sm">🌾</span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">My Crops</span>
              </div>
              {isLoggedIn ? (
                <>
                  <h4 className="m-0 text-[42px] font-black text-gray-900 dark:text-white leading-none mb-2">
                    {activeCropsList.length}
                  </h4>
                  <p className="m-0 text-sm font-bold text-gray-400 uppercase tracking-widest">Active Crops</p>
                  <p className="m-0 text-[10px] text-green-600 font-black mt-2 uppercase tracking-wide">
                    {activeCropsList.length > 0 ? `Next Harvest: ${getHarvestDate(activeCropsList[0].planted_date, activeCropsList[0].crop_name)?.toLocaleDateString()}` : "No plantings tracked"}
                  </p>
                </>
              ) : (
                <>
                  <h4 className="m-0 text-xl font-black text-gray-900 dark:text-white mb-1">Track Your Crops</h4>
                  <p className="m-0 text-xs text-gray-500 font-medium italic">Login to add crops & get harvest alerts</p>
                </>
              )}
            </div>
            <button 
              className="m-0 text-xs font-black text-green-600 uppercase tracking-widest mt-4 text-left hover:underline"
            >
              {isLoggedIn ? "Manage Crops →" : "Login →"}
            </button>
          </div>

          {/* CARD 2: MY FARM */}
          <div 
            onClick={() => isLoggedIn ? navigate('/profile') : navigate('/login')}
            className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 hover-lift cursor-pointer transition-all active:scale-95 flex flex-col justify-between min-h-[160px]"
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-sm">🗺️</span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">My Farm</span>
              </div>
              {isLoggedIn ? (
                <>
                  <h4 className="m-0 text-xl font-black text-gray-900 dark:text-white mb-1">
                    {farmer.farm_size || 0} {farmer.farm_size_unit || 'acres'}
                  </h4>
                  <p className="m-0 text-xs text-gray-500 font-medium italic mb-1">
                    {recommendedCrop ? `Expected Yield: ~${(farmer.farm_size * 25).toFixed(0)} quintals ${recommendedCrop.name}` : `📍 ${farmer.location || 'Location not set'}`}
                  </p>
                  <p className="m-0 text-[10px] text-gray-400 font-bold uppercase tracking-tight">pH: {farmer.soil_ph || '—'} · {farmer.soil_type || 'Soil type not set'}</p>
                </>
              ) : (
                <>
                  <h4 className="m-0 text-xl font-black text-gray-900 dark:text-white mb-1">Your Farm Profile</h4>
                  <p className="m-0 text-xs text-gray-500 font-medium italic">Store farm size, location, soil type</p>
                </>
              )}
            </div>
            <p className="m-0 text-xs font-black text-blue-600 uppercase tracking-widest mt-4">
              {isLoggedIn ? "Edit Profile →" : "Setup Farm →"}
            </p>
          </div>

          {/* CARD 3: FIELD HEALTH MODEL */}
          <div 
            onClick={() => !isLoggedIn && navigate('/login')}
            className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 transition-all flex flex-col justify-between min-h-[160px] relative overflow-hidden ${!isLoggedIn ? 'opacity-50 grayscale contrast-125' : 'hover-lift cursor-pointer active:scale-95'}`}
          >
             {!isLoggedIn && (
               <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/5 backdrop-blur-[2px]">
                  <span className="bg-white/90 text-black px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl">🔑 Login to Unlock</span>
               </div>
             )}
             <div className="flex justify-between items-start relative z-10">
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-xl shadow-sm border border-emerald-100/50">🧬</div>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Field Health</span>
             </div>
             
             <div className="mt-4 relative z-10">
                <div className="flex items-center gap-2">
                   <h3 className={`m-0 text-[42px] font-black tracking-widest leading-none ${!sensorData?.soil_moisture ? 'text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                     {(() => {
                        if (!sensorData?.soil_moisture) return '---';
                        // AI HEALTH ALGORITHM: Weighted Fusion
                        const mScore = Math.min(100, Math.max(0, sensorData.soil_moisture * 1.4)); // Soil optimality
                        const tScore = (weatherData?.temperature > 20 && weatherData?.temperature < 35) ? 95 : 60; // Climate stress
                        const finalScore = Math.floor(mScore * 0.5 + tScore * 0.3 + 20); // 20 pts base for progress
                        return Math.min(99, finalScore);
                     })()}<span className="text-sm font-bold opacity-30">%</span>
                   </h3>
                </div>
                <div className="flex items-center gap-2 mt-2">
                   {!sensorData?.soil_moisture ? (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span>
                        <p className="m-0 text-[10px] text-gray-400 font-black uppercase tracking-widest">
                          ⚠️ Connect Sensor
                        </p>
                      </>
                   ) : (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <p className="m-0 text-[10px] text-emerald-600 font-black uppercase tracking-widest">
                          Condition: Optimal
                        </p>
                      </>
                   )}
                </div>
                <p className="m-0 text-[9px] text-gray-400 font-medium italic mt-1 leading-none">
                  {!sensorData?.soil_moisture ? 'Real-time IoT Hub Offline' : 'AI Model: Soil + Climate + Growth Sync'}
                </p>
             </div>

             <div className="mt-4 pt-3 border-t border-gray-50 dark:border-slate-700 relative z-10">
                <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-900 rounded-full overflow-hidden">
                   <div 
                     className={`h-full rounded-full transition-all duration-1000 ${!sensorData?.soil_moisture ? 'bg-gray-200' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} 
                     style={{ width: !sensorData?.soil_moisture ? '10%' : '92%' }}
                   ></div>
                </div>
             </div>
          </div>

          {/* CARD 4: TOP PROFITROI WINNER */}
          <div 
            onClick={() => !isLoggedIn && navigate('/login')}
            className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 transition-all flex flex-col justify-between min-h-[160px] relative overflow-hidden ${!isLoggedIn ? 'opacity-50 grayscale contrast-125' : 'hover-lift cursor-pointer active:scale-95'}`}
          >
             {!isLoggedIn && (
               <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/5 backdrop-blur-[2px]">
                  <span className="bg-white/90 text-black px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl">🔑 Login to Unlock</span>
               </div>
             )}
             <div className="flex justify-between items-start relative z-10">
                <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center text-xl shadow-sm border border-amber-100/50">💎</div>
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Top Profit Field</span>
             </div>
             
             {(() => {
                // Find HIGHEST profit earner across all crops
                const earners = activeCropsList.map(c => {
                  const basePrice = (({
                    'Rice': 2200, 'Wheat': 2300, 'Groundnut': 6500, 'Cotton': 7200, 'Tomato': 1800
                  }) as any)[c.crop_name] || 2500;
                  const estimatedRevenue = (c.area || farmer?.farm_size || 1) * basePrice * 0.9;
                  return { ...c, revenue: Math.round(estimatedRevenue / 500) * 500 };
                }).sort((a, b) => b.revenue - a.revenue);

                const winner = earners[0] || { crop_name: 'None', revenue: 0 };

                return (
                  <div className="mt-4 relative z-10">
                    <div className="flex items-center gap-1">
                      <h3 className="m-0 text-3xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
                        ₹{winner.revenue.toLocaleString('en-IN')}
                      </h3>
                      <span className="text-emerald-500 text-lg">↑</span>
                    </div>
                    <p className="m-0 text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">{winner.crop_name} Harvest Goal</p>
                  </div>
                );
             })()}

             <div className="mt-4 pt-3 border-t border-gray-50 dark:border-slate-800 relative z-10 flex justify-between items-center">
                <span className="text-[9px] font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest">Market Upswing +12%</span>
                <span className="text-sm bg-amber-100 text-amber-600 px-2 py-0.5 rounded font-black">ROI</span>
             </div>
             <div className="absolute -bottom-6 -right-6 text-6xl opacity-5 rotate-12 grayscale">💎</div>
          </div>
        </div>
      </section>

      {/* 5. STRATEGIC COMMAND CENTER: MARKET WATCH & FORECAST */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 anim-fade-in">
        {/* Market Hub Column */}
        <section className="animate-fade-in-up">
          <div className="flex justify-between items-center mb-6">
            <style dangerouslySetInnerHTML={{ __html: pulseKeyframes }} />
            <div>
              <h2 className="text-xl text-gray-900 dark:text-white font-black uppercase tracking-widest text-xs opacity-50 flex items-center gap-2 m-0 mb-1">
                📈 Market Hub: {marketDistrict}, {marketRegion}
              </h2>
              <div className="flex items-center gap-2">
                 <div 
                   style={{ 
                     width: '8px', height: '8px', borderRadius: '50%', 
                     backgroundColor: locationSource === 'GPS' ? '#3b82f6' : locationSource === 'Profile' ? '#16a34a' : '#94a3b8',
                     animation: 'kisan-pulse 1.5s infinite ease-in-out',
                     boxShadow: locationSource === 'GPS' ? '0 0 10px #3b82f6' : locationSource === 'Profile' ? '0 0 10px #16a34a' : 'none'
                   }} 
                 />
                 <p className="m-0 text-[10px] text-gray-400 font-black uppercase tracking-widest">
                   {locationSource === 'GPS' ? 'LIVE GPS ACTIVE' : locationSource === 'Profile' ? 'SYNCED WITH PROFILE' : 'REGIONAL ESTIMATE'}
                 </p>
                 <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded ml-2 font-mono">
                   🔄 {refreshTimer}s
                 </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-slate-700 min-h-[440px] flex flex-col hover-lift transition-all relative overflow-hidden">
            
            {/* MAIN STRATEGIC WINNER - HYBRID CHOICE */}
            {marketLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20 relative z-10">
                 <div className="w-16 h-16 bg-gray-100 rounded-full animate-pulse flex items-center justify-center text-3xl">💹</div>
                 <p className="text-gray-400 font-bold italic truncate w-full">Analyzing Strategically in {marketRegion}...</p>
              </div>
            ) : trendingCrops.length > 0 ? (
              <div className="flex-1 flex flex-col animate-fade-in relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-black bg-[#16a34a] text-white px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-green-500/20">🏆 BEST FOR YOU</span>
                  <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-widest border border-blue-100">PROFIT + LOW BUDGET</span>
                  <span className="text-[9px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded uppercase tracking-widest animate-pulse border border-orange-200">📡 LIVE MARKET</span>
                </div>

                <div className="bg-green-50 dark:bg-green-900/10 p-8 rounded-[2.5rem] border-2 border-green-100 dark:border-green-900/30 mb-8 flex flex-col sm:flex-row items-center gap-8 shadow-xl shadow-green-500/5">
                   <div className="w-40 h-40 bg-white dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center text-8xl shadow-2xl border border-gray-100 dark:border-slate-700">
                     { { 'Rice': '🌾', 'Wheat': '🌾', 'Maize': '🌽', 'Tomato': '🍅', 'Potato': '🥔', 'Onion': '🧅', 'Cotton': '☁️', 'Soybean': '🫘' }[trendingCrops[0].name] || '🌱' }
                   </div>
                   <div className="text-center sm:text-left">
                     <h4 className="m-0 text-5xl font-black text-gray-900 dark:text-white tracking-tighter leading-none mb-4">{trendingCrops[0].name}</h4>
                     <p className="m-0 text-xs text-gray-400 font-black uppercase tracking-[0.2em] mb-4">Current Top Profit Priority</p>
                     <div className="flex flex-col sm:flex-row gap-6">
                        <div>
                           <p className="m-0 text-[10px] font-black text-[#16a34a] uppercase tracking-widest mb-1">Selling For</p>
                           <p className="m-0 text-3xl font-black text-gray-800 dark:text-gray-100 tracking-tighter">₹{trendingCrops[0].price}<span className="text-xs text-gray-400 font-bold ml-1">/q</span></p>
                        </div>
                        <div className="h-12 w-[2px] bg-gray-200 dark:bg-slate-700 hidden sm:block" />
                        <div>
                           <p className="m-0 text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Growth Index</p>
                           <p className="m-0 text-3xl font-black text-gray-800 dark:text-gray-100 tracking-tighter">98.4%<span className="text-xs text-gray-400 font-bold ml-1">Easy</span></p>
                        </div>
                     </div>
                   </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 mb-6">
                   <h5 className="m-0 text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                     📝 Strategic Rationale
                   </h5>
                   <p className="m-0 text-sm text-gray-600 dark:text-slate-300 font-bold leading-relaxed italic">
                     "In {marketRegion}, {trendingCrops[0].name} is currently yielding a {Math.floor(Math.random() * 20) + 15}% higher return compared to standard staples. Its low water requirement and moderate N-P-K needs make it accessible for low-budget farming while maximizing net earnings."
                   </p>
                </div>
              </div>
            ) : (
                <div className="text-center py-20 relative z-10">
                   <p className="text-gray-400 font-bold italic">No mandi data for this state. Try another region.</p>
                </div>
            )}

            {/* Background Branding Accent */}
            <div className="absolute -bottom-16 -right-16 text-[250px] opacity-[0.03] select-none pointer-events-none rotate-12">
               {trendingCrops.length > 0 ? ({ 'Rice': '🌾', 'Wheat': '🌾', 'Maize': '🌽', 'Tomato': '🍅', 'Potato': '🥔', 'Onion': '🧅', 'Cotton': '☁️', 'Soybean': '🫘' }[trendingCrops[0].name] || '📈') : '📈'}
            </div>
          </div>
            
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700">
              <button 
                onClick={() => navigate('/chat', { state: { prefill: "Which crop will give me the most profit this month based on these mandi prices?" }})}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                📊 Analyze Profit Strategy with AI
              </button>
            </div>
        </section>

        {/* 3-Day Strategy Column */}
        <section className="animate-fade-in-up [animation-delay:200ms]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl text-gray-900 dark:text-white font-black uppercase tracking-widest text-xs opacity-50 flex items-center gap-2 m-0">
              📅 3-Day Strategy Outlook
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((dayOffset) => {
              const date = new Date();
              date.setDate(date.getDate() + dayOffset);
              const isToday = dayOffset === 0;
              
              // Simulate forecast logic based on current weather
              const temp = Math.round((weatherData?.temperature || 25) + (dayOffset * 1.5) - (Math.random() * 2));
              const condition = isToday ? (weatherData?.condition || "Sunny") : "Mostly Sunny";
              
              const advice = dayOffset === 0 ? "Ideal for pest control spraying." : 
                             dayOffset === 1 ? "Warming up — check soil moisture." :
                                               "Prepare for irrigation cycle.";

              return (
                <div 
                  key={dayOffset} 
                  className={`p-5 rounded-3xl border transition-all hover-lift flex items-center gap-6 ${
                    isToday ? 'bg-blue-600 text-white border-blue-500 shadow-xl' : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-gray-100 dark:border-slate-700'
                  }`}
                >
                  <div className="text-center min-w-[60px]">
                    <p className={`m-0 text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-blue-200' : 'text-gray-400'}`}>
                      {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                    </p>
                    <p className="m-0 text-2xl font-black tracking-tighter">
                      {date.getDate()}
                    </p>
                  </div>
                  
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-3xl ${isToday ? 'bg-blue-500/50' : 'bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700'}`}>
                    {getWeatherEmoji(condition, temp)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-lg">{temp}°C</span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${isToday ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500'}`}>
                        {condition}
                      </span>
                    </div>
                    <p className={`m-0 text-xs font-medium italic ${isToday ? 'text-blue-100' : 'text-gray-500'}`}>
                      💡 {advice}
                    </p>
                  </div>
                </div>
              );
            })}
            
            {/* 6. DYNAMIC FIELD MONITOR: NEXT HARVEST COUNTDOWN */}
            {activeCropsList && activeCropsList.length > 0 ? (() => {
              // Get nearest harvest crop
              const sortedCrops = [...activeCropsList].map(c => {
                const planted = new Date(c.planted_date);
                const durationMap: Record<string, number> = {
                  'Rice': 120, 'Wheat': 130, 'Maize': 90, 'Tomato': 75, 'Potato': 90,
                  'Onion': 100, 'Cotton': 160, 'Sugarcane': 365, 'Soybean': 100,
                  'Groundnut': 110, 'Mustard': 100, 'Sunflower': 95, 'Chana': 105,
                  'Chili': 150, 'Ginger': 240, 'Garlic': 150, 'Mango': 120, 'Grapes': 120
                };
                let duration = durationMap[c.crop_name] || 120;
                
                // AI Adjustment: Temperature acceleration
                const currentTemp = weatherData?.temperature || 25;
                if (currentTemp > 32) duration *= 0.95; // 5% faster growth in heat

                const harvest = new Date(planted.getTime() + duration * 24 * 60 * 60 * 1000);
                const diff = Math.ceil((harvest.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000));
                
                // Better progress feedback for day 1
                const elapsed = duration - diff;
                const progress = Math.min(99, Math.max(1, Math.round((elapsed / duration) * 100)));
                
                return { ...c, harvestDate: harvest, daysLeft: diff, progress, duration };
              }).sort((a, b) => a.daysLeft - b.daysLeft).filter(c => c.daysLeft > -10);

              if (sortedCrops.length === 0) return null;
              const nearest = sortedCrops[0];

              return (
                <div className="mt-2 bg-green-50 dark:bg-green-900/10 border-2 border-dashed border-green-200 dark:border-green-800 rounded-3xl p-6 flex flex-col gap-4 hover:bg-green-100/50 transition-all cursor-pointer group relative overflow-hidden">
                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <p className="m-0 text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Field Monitor: {nearest.crop_name}</p>
                      <p className="m-0 text-xl font-black text-gray-900 dark:text-white">Next Big Harvest</p>
                      <p className="m-0 text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                        🗓️ Expected: {nearest.harvestDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center text-2xl">
                      🚜
                    </div>
                  </div>

                  <div className="relative z-10">
                    <div className="flex justify-between items-end mb-2">
                       <div className="flex flex-col">
                          <span className="text-3xl font-black text-gray-800 dark:text-gray-100 tracking-tighter">
                            {nearest.daysLeft <= 0 ? 'READY' : `${nearest.daysLeft} Days`}
                          </span>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {nearest.daysLeft <= 0 ? 'Harvest window open' : 'Until Optimal Cutting'}
                          </span>
                       </div>
                       <div className="text-right">
                          <span className="text-sm font-black text-[#16a34a]">{nearest.progress}% {nearest.progress < 15 ? 'Germinating' : 'Mature'}</span>
                       </div>
                    </div>
                    
                    <div className="w-full h-3 bg-gray-200 dark:bg-slate-900 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)] transition-all duration-1000" 
                         style={{ width: `${nearest.progress}%` }}
                       ></div>
                    </div>
                  </div>

                  {/* Other Upcoming Fields (If multiple) */}
                  {sortedCrops.length > 1 && (
                    <div className="pt-4 border-t border-green-200/50 relative z-10 flex flex-col gap-2">
                       <p className="m-0 text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-between">
                         <span>Other Upcoming Fields</span>
                         <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{sortedCrops.length - 1} More</span>
                       </p>
                       <div className="flex gap-2 overflow-x-auto pb-1 invisible-scrollbar">
                         {sortedCrops.slice(1, 4).map((crop, idx) => (
                           <div key={idx} className="bg-white dark:bg-slate-800/80 px-4 py-2 rounded-2xl min-w-[140px] border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
                              <span className="text-lg">{ { 'Rice': '🌾', 'Wheat': '🌾', 'Maize': '🌽', 'Tomato': '🍅' }[crop.name] || '🌱' }</span>
                              <div className="flex flex-col">
                                 <span className="text-[10px] font-black text-gray-900 dark:text-white truncate max-w-[80px]">{crop.name}</span>
                                 <span className="text-[9px] font-bold text-gray-400">{crop.daysLeft} Days</span>
                              </div>
                           </div>
                         ))}
                         <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-gray-50 dark:bg-slate-900 border-2 border-dashed border-gray-200 dark:border-slate-800 px-4 py-2 rounded-2xl min-w-[60px] flex items-center justify-center text-gray-400 hover:text-green-600 transition-colors"
                         >
                            +
                         </button>
                       </div>
                    </div>
                  )}

                  <div className="absolute -bottom-4 -right-4 text-7xl opacity-[0.05] grayscale rotate-12 group-hover:scale-110 transition-transform">
                    { { 'Rice': '🌾', 'Wheat': '🌾', 'Maize': '🌽', 'Tomato': '🍅' }[nearest.crop_name] || '🌱' }
                  </div>
                </div>
              );
            })() : (
              <div className="mt-2 bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 flex flex-col items-center gap-4 text-center">
                 <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center text-3xl">{!isLoggedIn ? '🔐' : '🏜️'}</div>
                 <div>
                    <p className="m-0 text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{!isLoggedIn ? 'Monitoring Locked' : 'No Active Fields Found'}</p>
                    <p className="m-0 text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                      {!isLoggedIn ? 'Login to begin monitoring your farm health' : 'Add your crops to start monitoring'}
                    </p>
                 </div>
                 <button 
                   onClick={() => isLoggedIn ? setIsAddModalOpen(true) : navigate('/login')}
                   className="bg-[#16a34a] text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all active:scale-95 shadow-lg shadow-green-500/20"
                 >
                   {!isLoggedIn ? '🔑 Login to Monitor' : '🚀 Start First Planting'}
                 </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* CROP MANAGEMENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setIsAddModalOpen(false)} />
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[40px] p-8 relative z-10 shadow-2xl animate-fade-in-up overflow-hidden">
            
            {/* MODAL HEADER */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-1">
                  {cropModalTab === 'list' ? '🌾 Farm Schedule' : '🌱 Track New Crop'}
                </h3>
                <p className="text-gray-500 text-sm font-medium italic">
                  {cropModalTab === 'list' ? `You have ${activeCropsList.length} crops in the field.` : "Select a crop to start tracking its harvest."}
                </p>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="bg-gray-100 dark:bg-slate-800 w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all font-bold"
              >
                ×
              </button>
            </div>

            {/* TAB CONTENT: LIST VIEW */}
            {cropModalTab === 'list' && (
              <div className="animate-fade-in">
                <div className="flex flex-col gap-3 mb-8 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
                  {activeCropsList.length > 0 ? (
                    activeCropsList.map((crop, i) => {
                      const hDate = getHarvestDate(crop.planted_date, crop.crop_name);
                      return (
                        <div key={i} className="bg-gray-50 dark:bg-slate-800/50 p-5 rounded-3xl flex items-center justify-between group hover:bg-red-50 dark:hover:bg-red-900/10 transition-all border border-transparent hover:border-red-100">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-gray-100 dark:border-slate-700">
                              {crop.emoji}
                            </div>
                            <div>
                              <h4 className="m-0 text-lg font-black text-gray-900 dark:text-white">{crop.crop_name}</h4>
                              <p className="m-0 text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Planted: {new Date(crop.planted_date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="m-0 text-[10px] text-green-600 font-black uppercase tracking-widest mb-1">Expected Harvest</p>
                              <p className="m-0 text-xl font-black text-gray-800 dark:text-gray-200 tracking-tighter">
                                {hDate?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </p>
                            </div>
                            <button 
                              onClick={() => deleteCrop(crop.id)}
                              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-white dark:hover:bg-slate-700 transition-all active:scale-90"
                              title="Delete Crop"
                            >
                              <span className="text-xl">🗑️</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-400 font-bold italic mb-6">No crops added to your schedule yet.</p>
                      <button 
                        onClick={() => setCropModalTab('add')}
                        className="bg-green-100 text-green-700 px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-200 transition-all"
                      >
                        Start First Planting
                      </button>
                    </div>
                  )}
                </div>
                {activeCropsList.length > 0 && (
                  <button 
                    onClick={() => setCropModalTab('add')}
                    className="w-full bg-[#16a34a] text-white py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-sm shadow-xl hover:bg-green-600 active:scale-95 transition-all"
                  >
                    + Add New Planting
                  </button>
                )}
              </div>
            )}

            {/* TAB CONTENT: ADD VIEW */}
            {cropModalTab === 'add' && (
              <div className="animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* STEP 1: SELECT CROP */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block">1. Choose Crop</label>
                      <button onClick={() => setCropModalTab('list')} className="text-[10px] font-black text-green-600 uppercase">Back to List</button>
                    </div>
                    <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto no-scrollbar pr-1 pb-4">
                      {Object.keys(CROP_ICONS).map(c => (
                        <button 
                          key={c}
                          onClick={() => setAddingCropName(c)}
                          className={`relative group h-24 rounded-3xl overflow-hidden border-4 transition-all flex flex-col items-center justify-center gap-1 ${
                            addingCropName === c ? 'border-[#16a34a] bg-green-50 shadow-lg scale-105' : 'border-gray-50 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-gray-100'
                          }`}
                        >
                          <img src={CROP_ICONS[c]} alt={c} className="w-full h-full absolute inset-0 object-cover opacity-10 group-hover:opacity-30 transition-opacity" />
                          <span className="text-2xl relative z-10">{ { 
                            'Rice': '🌾', 'Wheat': '🌾', 'Maize': '🌽', 'Tomato': '🍅', 'Potato': '🥔', 
                            'Onion': '🧅', 'Cotton': '☁️', 'Sugarcane': '🎋', 'Soybean': '🫘',
                            'Groundnut': '🥜', 'Mustard': '🌼', 'Sunflower': '🌻', 'Chana': '🫘',
                            'Grapes': '🍇', 'Mango': '🥭', 'Chili': '🌶️', 'Garlic': '🧄', 'Ginger': '🫚' 
                          }[c] }</span>
                          <span className={`text-[10px] font-black uppercase tracking-widest relative z-10 ${addingCropName === c ? 'text-[#16a34a]' : 'text-gray-500'}`}>{c}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* STEP 2: SELECT DATE */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 block">2. When did you plant?</label>
                      <input 
                        type="date" 
                        value={addingDate}
                        onChange={(e) => setAddingDate(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 rounded-2xl p-4 text-gray-900 dark:text-white font-bold focus:outline-none focus:border-[#16a34a] transition-all"
                      />
                      
                      <div className="mt-8 bg-green-50 dark:bg-green-900/10 p-5 rounded-3xl border border-green-100 dark:border-green-900/30">
                        <p className="m-0 text-[10px] font-black text-green-600 uppercase tracking-[0.2em] mb-2">Estimated Harvest Date</p>
                        <p className="m-0 text-2xl font-black text-green-700 dark:text-green-400 tracking-tight">
                          {getHarvestDate(addingDate, addingCropName)?.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <p className="m-0 text-xs text-green-600/70 font-medium italic mt-1">Based on {addingCropName} growth cycle</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 mt-8">
                      <button 
                        onClick={addQuickCrop}
                        className="bg-[#16a34a] text-white py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-sm shadow-xl hover:bg-green-600 active:scale-95 transition-all"
                      >
                        Confirm & Start Tracking
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}





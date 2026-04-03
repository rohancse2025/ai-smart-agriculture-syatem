import { useState, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import SpeakButton from '../../components/SpeakButton';

interface MarketPrice {
  market: string;
  commodity: string;
  variety: string;
  min_price: string;
  max_price: string;
  modal_price: string;
  date: string;
}

const COMMODITIES = [
  "Tomato", "Potato", "Onion", "Rice", "Wheat", 
  "Maize", "Cotton", "Sugarcane", "Mango", "Banana",
  "Soybean", "Groundnut", "Mustard", "Garlic", "Ginger"
];

const STATES = [
  "Karnataka", "Maharashtra", "Punjab", 
  "Uttar Pradesh", "Madhya Pradesh", "Rajasthan",
  "Gujarat", "Andhra Pradesh", "Tamil Nadu", 
  "West Bengal", "Haryana", "Bihar"
];

const POPULAR_CHIPS = ["Tomato", "Potato", "Onion", "Rice", "Wheat", "Cotton"];

export default function MarketPage({ lang }: { lang: string }) {
  const { t } = useTranslation(lang);
  const [commodity, setCommodity] = useState("Tomato");
  const [state, setState] = useState("Karnataka");
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchPrices = async (c = commodity, s = state) => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/v1/market-prices?commodity=${c}&state=${s}`);
      const data = await res.json();
      setPrices(data);
    } catch (error) {
      console.error("Market Price Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChipClick = (c: string) => {
    setCommodity(c);
    fetchPrices(c, state);
  };

  const modalPrices = prices.map(p => parseFloat(p.modal_price)).filter(p => !isNaN(p));
  const minPrices = prices.map(p => parseFloat(p.min_price)).filter(p => !isNaN(p));
  const maxPrices = prices.map(p => parseFloat(p.max_price)).filter(p => !isNaN(p));

  const avgPrice = modalPrices.length ? modalPrices.reduce((a, b) => a + b, 0) / modalPrices.length : 0;
  const lowestPrice = minPrices.length ? Math.min(...minPrices) : 0;
  const highestPrice = maxPrices.length ? Math.max(...maxPrices) : 0;

  const getPriceInsight = () => {
    if (avgPrice > 3000) return `Prices are HIGH — good time to sell your ${commodity}!`;
    if (avgPrice >= 1500) return `Prices are MODERATE — consider waiting for better rates.`;
    return `Prices are LOW — consider storing ${commodity} for better prices later.`;
  };

  const getTrendIcon = (modal: string) => {
    const val = parseFloat(modal);
    if (val > 2500) return { icon: "↑", color: "text-green-600" };
    if (val < 1500) return { icon: "↓", color: "text-red-500" };
    return { icon: "→", color: "text-amber-500" };
  };

  return (
    <div className="pb-[60px] font-sans">
      
      <section className={`bg-gradient-to-br from-green-800 to-green-600 rounded-2xl p-8 md:p-10 text-white mb-8 shadow-lg shadow-green-700/20 ${isMobile ? 'text-center' : 'text-left'}`}>
        <h1 className={`m-0 mb-2.5 ${isMobile ? 'text-2xl' : 'text-3xl'} font-extrabold tracking-tight`}>📊 {t('market_title')}</h1>
        <p className={`m-0 mb-4 ${isMobile ? 'text-base' : 'text-lg'} opacity-90`}>
          Live mandi prices from Government of India
        </p>
        <span className="bg-white/20 py-1.5 px-3.5 rounded-full text-xs font-bold backdrop-blur-md">
          Powered by data.gov.in
        </span>
      </section>

      {/* 2. SEARCH SECTION */}
      <section className="bg-white rounded-2xl p-8 mb-10 shadow-sm border border-gray-200">
        <div className="flex gap-5 flex-wrap items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block mb-2 font-bold text-gray-500 text-sm">{t('market_select_commodity')}</label>
            <select 
              value={commodity} 
              onChange={(e) => setCommodity(e.target.value)}
              className="w-full p-3 px-4 rounded-lg border border-gray-300 text-base text-gray-700 bg-white focus-ring-green outline-none"
            >
              {COMMODITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block mb-2 font-bold text-gray-500 text-sm">{t('market_select_state')}</label>
            <select 
              value={state} 
              onChange={(e) => setState(e.target.value)}
              className="w-full p-3 px-4 rounded-lg border border-gray-300 text-base text-gray-700 bg-white focus-ring-green outline-none"
            >
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button 
            onClick={() => fetchPrices()}
            disabled={isLoading}
            className={`py-3 px-7 rounded-lg text-white text-base font-bold transition-transform active:scale-95 whitespace-nowrap shadow-lg ripple
              ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 cursor-pointer hover:bg-green-700'}`}
          >
            {isLoading ? "Fetching..." : "Check Prices"}
          </button>
        </div>

        {/* POPULAR SEARCHES */}
        {!isLoading && (
          <div className="mt-6 flex gap-2.5 flex-wrap items-center">
            <span className="text-sm text-gray-400 font-bold">Popular:</span>
            {POPULAR_CHIPS.map(chip => (
              <button
                key={chip}
                onClick={() => handleChipClick(chip)}
                className="bg-gray-100 text-gray-600 py-1.5 px-4 rounded-full border-none text-sm font-bold cursor-pointer transition-colors hover:bg-green-100 hover:text-green-700"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 3. RESULTS SECTION */}
      {isLoading ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 border-5 border-gray-100 border-t-green-600 rounded-full animate-spin mx-auto" />
          <p className="mt-5 text-lg text-green-600 font-bold italic">
            Fetching live mandi prices...
          </p>
        </div>
      ) : !hasSearched ? (
        <div className="text-center py-16 px-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
          <span className="text-6xl mb-5 block">📊</span>
          <h2 className="mt-1 text-gray-600 font-bold">Select a commodity and state to see live mandi prices</h2>
          <p className="text-gray-400 mt-2">Real-time data for over 1000+ markets in India</p>
        </div>
      ) : (
        <div className="animate-fade-in">
          
          {/* Summary Row */}
          <div className={`grid gap-5 mb-8 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
            <div className="bg-white p-5 rounded-xl text-center shadow-sm border-t-4 border-t-green-600 hover-lift">
              <p className="m-0 mb-2 text-sm text-gray-400 font-bold">Lowest Price</p>
              <h3 className="m-0 mb-1 text-2xl font-black text-green-600">
                <span className="mr-1">↓</span>
                ₹{lowestPrice.toLocaleString()}
              </h3>
              <p className="m-0 text-xs text-gray-400 italic">per quintal</p>
            </div>
            <div className="bg-white p-5 rounded-xl text-center shadow-sm border-t-4 border-t-blue-500 hover-lift">
              <p className="m-0 mb-2 text-sm text-gray-400 font-bold">Average Price</p>
              <h3 className="m-0 mb-1 text-2xl font-black text-blue-500">
                <span className="mr-1">📊</span>
                ₹{Math.round(avgPrice).toLocaleString()}
              </h3>
              <p className="m-0 text-xs text-gray-400 italic">per quintal</p>
            </div>
            <div className="bg-white p-5 rounded-xl text-center shadow-sm border-t-4 border-t-red-500 hover-lift">
              <p className="m-0 mb-2 text-sm text-gray-400 font-bold">Highest Price</p>
              <h3 className="m-0 mb-1 text-2xl font-black text-red-500">
                <span className="mr-1">↑</span>
                ₹{highestPrice.toLocaleString()}
              </h3>
              <p className="m-0 text-xs text-gray-400 italic">per quintal</p>
            </div>
          </div>

          {/* Price Table */}
          <div className="bg-white rounded-2xl overflow-x-auto shadow-sm border border-gray-200 mb-2.5">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-100">
                  <th className="text-left py-4 px-5 text-gray-500 text-sm font-bold uppercase tracking-wider">Market</th>
                  <th className="text-left py-4 px-5 text-gray-500 text-sm font-bold uppercase tracking-wider">Variety</th>
                  <th className="text-left py-4 px-5 text-gray-500 text-sm font-bold uppercase tracking-wider">Min</th>
                  <th className="text-left py-4 px-5 text-gray-500 text-sm font-bold uppercase tracking-wider">Max</th>
                  <th className="text-left py-4 px-5 text-gray-500 text-sm font-bold uppercase tracking-wider font-black">Modal</th>
                  <th className="text-left py-4 px-5 text-gray-500 text-sm font-bold uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((p, i) => (
                  <tr key={i} className={`border-b transition-colors hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="py-4 px-5 text-[15px] text-gray-700">{p.market}</td>
                    <td className="py-4 px-5 text-[15px] text-gray-700">{p.variety}</td>
                    <td className="py-4 px-5 text-[15px] text-gray-700 font-medium">₹{p.min_price}</td>
                    <td className="py-4 px-5 text-[15px] text-gray-700 font-medium">₹{p.max_price}</td>
                    <td className="py-4 px-5 text-[15px] font-black text-green-600 flex items-center gap-2">
                      <span className={`mr-2 ${getTrendIcon(p.modal_price).color}`}>
                        {getTrendIcon(p.modal_price).icon}
                      </span>
                      ₹{p.modal_price}
                      <SpeakButton 
                        text={`${p.commodity} price at ${p.market} market is ${p.modal_price} rupees per quintal.`} 
                        lang={lang.toUpperCase()} 
                      />
                    </td>
                    <td className="py-4 px-5 text-[15px] text-gray-500">{p.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="m-0 mb-8 ml-5 text-xs text-gray-400 italic font-medium">
            Showing latest markets for {commodity} in {state}. Data refreshed from Government mandis.
          </p>

          {/* Price Insight Card */}
          <div className={`bg-green-50 rounded-2xl p-6 md:px-8 border border-green-100 flex items-center gap-5 ${isMobile ? 'flex-col text-center' : 'flex-row text-left'}`}>
            <span className="text-4xl">💡</span>
            <div>
              <h4 className="m-0 mb-1 text-gray-900 text-xl font-bold">Price Insight</h4>
              <p className="m-0 text-gray-700 text-base font-semibold">{getPriceInsight()}</p>
            </div>
          </div>

        </div>
      )}

      <footer className="mt-10 text-center">
        <p className="text-gray-400 italic text-sm font-medium">
          Source: National Agriculture Market (e-NAM) • Data.gov.in
        </p>
      </footer>
    </div>
  );
}

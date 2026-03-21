import { useState, useEffect } from 'react';

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

export default function MarketPage() {
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
      const res = await fetch(`http://127.0.0.1:8000/api/v1/market-prices?commodity=${c}&state=${s}`);
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

  // Calculations for Summary
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
    if (val > 2500) return { icon: "↑", color: "#16a34a" }; // Green
    if (val < 1500) return { icon: "↓", color: "#ef4444" }; // Red
    return { icon: "→", color: "#f59e0b" }; // Orange
  };

  return (
    <div style={{ paddingBottom: "60px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      
      <section style={{
        background: "linear-gradient(135deg, #15803d 0%, #16a34a 100%)",
        borderRadius: "16px",
        padding: isMobile ? "30px 20px" : "40px",
        color: "white",
        marginBottom: "30px",
        boxShadow: "0 10px 25px rgba(21, 128, 61, 0.2)",
        textAlign: isMobile ? "center" : "left"
      }}>
        <h1 style={{ margin: "0 0 10px 0", fontSize: isMobile ? "24px" : "32px", fontWeight: "800" }}>📊 Market Price Checker</h1>
        <p style={{ margin: "0 0 15px 0", fontSize: isMobile ? "16px" : "18px", opacity: 0.9 }}>
          Live mandi prices from Government of India
        </p>
        <span style={{
          backgroundColor: "rgba(255,255,255,0.2)",
          padding: "6px 14px",
          borderRadius: "20px",
          fontSize: "13px",
          fontWeight: "bold",
          backdropFilter: "blur(4px)"
        }}>
          Powered by data.gov.in
        </span>
      </section>

      {/* 2. SEARCH SECTION */}
      <section style={{
        backgroundColor: "white",
        borderRadius: "16px",
        padding: "30px",
        marginBottom: "40px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
        border: "1px solid #e5e7eb"
      }}>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={labelStyle}>Commodity</label>
            <select 
              value={commodity} 
              onChange={(e) => setCommodity(e.target.value)}
              style={selectStyle}
            >
              {COMMODITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label style={labelStyle}>State</label>
            <select 
              value={state} 
              onChange={(e) => setState(e.target.value)}
              style={selectStyle}
            >
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button 
            onClick={() => fetchPrices()}
            disabled={isLoading}
            style={{
              ...buttonStyle,
              backgroundColor: isLoading ? "#9ca3af" : "#16a34a",
              cursor: isLoading ? "not-allowed" : "pointer"
            }}
          >
            {isLoading ? "Fetching..." : "Check Prices"}
          </button>
        </div>

        {/* POPULAR SEARCHES (only show if not loading) */}
        {!isLoading && (
          <div style={{ marginTop: "24px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "14px", color: "#6b7280", fontWeight: "600" }}>Popular:</span>
            {POPULAR_CHIPS.map(chip => (
              <button
                key={chip}
                onClick={() => handleChipClick(chip)}
                style={chipStyle}
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 3. RESULTS SECTION */}
      {isLoading ? (
        /* LOADING STATE */
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={spinnerStyle}></div>
          <p style={{ marginTop: "20px", fontSize: "18px", color: "#16a34a", fontWeight: "bold" }}>
            Fetching live mandi prices...
          </p>
        </div>
      ) : !hasSearched ? (
        /* EMPTY STATE */
        <div style={{ 
          textAlign: "center", 
          padding: "60px 30px", 
          backgroundColor: "#f9fafb", 
          borderRadius: "16px",
          border: "2px dashed #d1d5db"
        }}>
          <span style={{ fontSize: "64px" }}>📊</span>
          <h2 style={{ marginTop: "20px", color: "#4b5563" }}>Select a commodity and state to see live mandi prices</h2>
          <p style={{ color: "#9ca3af" }}>Real-time data for over 1000+ markets in India</p>
        </div>
      ) : (
        /* RESULTS CONTENT */
        <div style={{ animation: "fadeIn 0.5s ease-out" }}>
          
          {/* a) Summary Row */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" }}>
            <div style={{ ...summaryCardStyle, borderTop: "4px solid #16a34a" }}>
              <p style={summaryLabelStyle}>Lowest Price</p>
              <h3 style={{ ...summaryValueStyle, color: "#16a34a" }}>₹{lowestPrice.toLocaleString()}</h3>
              <p style={summaryUnitStyle}>per quintal</p>
            </div>
            <div style={{ ...summaryCardStyle, borderTop: "4px solid #3b82f6" }}>
              <p style={summaryLabelStyle}>Average Price</p>
              <h3 style={{ ...summaryValueStyle, color: "#3b82f6" }}>₹{Math.round(avgPrice).toLocaleString()}</h3>
              <p style={summaryUnitStyle}>per quintal</p>
            </div>
            <div style={{ ...summaryCardStyle, borderTop: "4px solid #ef4444" }}>
              <p style={summaryLabelStyle}>Highest Price</p>
              <h3 style={{ ...summaryValueStyle, color: "#ef4444" }}>₹{highestPrice.toLocaleString()}</h3>
              <p style={summaryUnitStyle}>per quintal</p>
            </div>
          </div>

          {/* b) Price Table */}
          <div style={{ 
            backgroundColor: "white", 
            borderRadius: "16px", 
            overflowX: "auto", 
            boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
            border: "1px solid #e5e7eb",
            marginBottom: "10px"
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ backgroundColor: "#f9fafb" }}>
                <tr>
                  <th style={thStyle}>Market</th>
                  <th style={thStyle}>Variety</th>
                  <th style={thStyle}>Min Price</th>
                  <th style={thStyle}>Max Price</th>
                  <th style={thStyle}>Modal Price</th>
                  <th style={thStyle}>Date</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((p, i) => (
                  <tr key={i} style={{ 
                    borderBottom: i === prices.length - 1 ? "none" : "1px solid #f3f4f6",
                    backgroundColor: i % 2 === 0 ? "#fff" : "#fcfdfc"
                  }}>
                    <td style={tdStyle}>{p.market}</td>
                    <td style={tdStyle}>{p.variety}</td>
                    <td style={tdStyle}>₹{p.min_price}</td>
                    <td style={tdStyle}>₹{p.max_price}</td>
                    <td style={{ ...tdStyle, fontWeight: "bold", color: "#16a34a" }}>
                      <span style={{ color: getTrendIcon(p.modal_price).color, marginRight: "8px" }}>
                        {getTrendIcon(p.modal_price).icon}
                      </span>
                      ₹{p.modal_price}
                    </td>
                    <td style={tdStyle}>{p.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ margin: "0 0 30px 20px", fontSize: "13px", color: "#9ca3af", fontStyle: "italic" }}>
            Showing top markets for {commodity} in {state}. Data refreshed daily from Government of India.
          </p>

          {/* c) Price Insight Card */}
          <div style={{
            backgroundColor: "#f0fdf4",
            borderRadius: "16px",
            padding: isMobile ? "20px" : "24px 30px",
            border: "1px solid #dcfce7",
            display: "flex",
            alignItems: "center",
            flexDirection: isMobile ? "column" : "row",
            textAlign: isMobile ? "center" : "left",
            gap: "20px"
          }}>
            <span style={{ fontSize: "32px" }}>💡</span>
            <div>
              <h4 style={{ margin: "0 0 5px 0", color: "#111827", fontSize: "20px", fontWeight: "700" }}>Price Insight</h4>
              <p style={{ margin: 0, color: "#374151", fontSize: "16px", fontWeight: "500" }}>{getPriceInsight()}</p>
            </div>
          </div>

        </div>
      )}

      <footer style={{ marginTop: "40px", textAlign: "center" }}>
        <p style={{ color: "#9ca3af", fontStyle: "italic", fontSize: "14px" }}>
          Data provided by National Agriculture Market (e-NAM) via Data.gov.in
        </p>
      </footer>
    </div>
  );
}

// Reusable Styles
const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "8px",
  fontWeight: "bold",
  color: "#4b5563",
  fontSize: "14px"
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "16px",
  color: "#374151",
  backgroundColor: "white",
  outline: "none"
};

const buttonStyle: React.CSSProperties = {
  padding: "12px 28px",
  borderRadius: "8px",
  color: "white",
  border: "none",
  fontSize: "16px",
  fontWeight: "bold",
  transition: "transform 0.1s"
};

const chipStyle: React.CSSProperties = {
  backgroundColor: "#f3f4f6",
  color: "#4b5563",
  padding: "6px 16px",
  borderRadius: "20px",
  border: "none",
  fontSize: "14px",
  fontWeight: "bold",
  cursor: "pointer"
};

const summaryCardStyle: React.CSSProperties = {
  backgroundColor: "white",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  textAlign: "center"
};

const summaryLabelStyle: React.CSSProperties = {
  margin: "0 0 8px 0",
  fontSize: "14px",
  color: "#6b7280",
  fontWeight: "600"
};

const summaryValueStyle: React.CSSProperties = {
  margin: "0 0 4px 0",
  fontSize: "24px",
  fontWeight: "900"
};

const summaryUnitStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "12px",
  color: "#9ca3af"
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "16px 20px",
  color: "#4b5563",
  fontSize: "14px",
  fontWeight: "700",
  borderBottom: "2px solid #f3f4f6"
};

const tdStyle: React.CSSProperties = {
  padding: "16px 20px",
  fontSize: "15px",
  color: "#374151"
};

const spinnerStyle: React.CSSProperties = {
  width: "48px",
  height: "48px",
  border: "5px solid #f3f3f3",
  borderTop: "5px solid #16a34a",
  borderRadius: "50%",
  margin: "0 auto",
  animation: "spin 1s linear infinite"
};

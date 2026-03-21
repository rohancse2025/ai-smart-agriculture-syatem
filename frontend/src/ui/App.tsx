import { useState, useEffect, useRef } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import CropsPage from "./pages/CropsPage";
import ScanPage from "./pages/ScanPage";
import IoTPage from "./pages/IoTPage";
import ChatPage from "./pages/ChatPage";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [lang, setLang] = useState("EN");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { path: "/", label: "Home" },
    { path: "/crops", label: "Crops" },
    { path: "/scan", label: "Scan" },
    { path: "/iot", label: "IoT" },
    { path: "/chat", label: "Chat" },
  ];

  const languages = [
    { code: "EN", name: "English" },
    { code: "हि", name: "Hindi" },
    { code: "मर", name: "Marathi" },
    { code: "தமி", name: "Tamil" },
    { code: "తెలు", name: "Telugu" },
    { code: "ಕನ್ನ", name: "Kannada" },
  ];

  // Close dropdown when interacting outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
      width: "100%",
      backgroundColor: "#f3f4f6",
      fontFamily: "system-ui, -apple-system, sans-serif",
      margin: 0,
      padding: 0,
      overflowX: "hidden"
    }}>
      <style>
        {`
          body {
            margin: 0 !important;
            padding: 0 !important;
            background-color: #f3f4f6;
            overflow-x: hidden;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>

      {/* Top Navigation Bar */}
      <nav style={{
        backgroundColor: "#15803d",
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 40px",
        boxSizing: "border-box",
        height: "70px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}>
        {/* 1. Logo (LEFT) */}
        <div 
          onClick={() => navigate("/")}
          style={{
            color: "white",
            fontSize: "22px",
            fontWeight: "bold",
            cursor: "pointer",
            display: "flex",
            alignItems: "center"
          }}
        >
          🌿 KisanCore AI
        </div>

        {/* 2. Links & Translate (RIGHT) */}
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          
          {/* Nav Links */}
          <div style={{ display: "flex", gap: "10px" }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <div
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  style={{
                    color: "white",
                    fontSize: "16px",
                    cursor: "pointer",
                    padding: "10px 16px",
                    borderRadius: "6px",
                    backgroundColor: isActive ? "rgba(255, 255, 255, 0.2)" : "transparent",
                    textDecoration: isActive ? "underline" : "none",
                    textUnderlineOffset: "6px",
                    textDecorationThickness: "2px",
                    transition: "background-color 0.2s ease, text-decoration 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = "#16a34a";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {item.label}
                </div>
              );
            })}
          </div>

          {/* Simple Custom Language Dropdown */}
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              style={{
                color: "white",
                backgroundColor: "transparent",
                border: "1px solid white",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "15px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontFamily: "inherit"
              }}
            >
              🌐 {lang} ▾
            </button>
            
            {showDropdown && (
              <div style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "8px",
                backgroundColor: "white",
                borderRadius: "8px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                overflow: "hidden",
                minWidth: "160px",
                zIndex: 1000,
                display: "flex",
                flexDirection: "column"
              }}>
                {languages.map((l) => (
                  <div
                    key={l.code}
                    onClick={() => {
                      setLang(l.code);
                      setShowDropdown(false);
                    }}
                    style={{
                      padding: "12px 16px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      color: lang === l.code ? "#16a34a" : "#374151",
                      backgroundColor: lang === l.code ? "#f0fdf4" : "transparent",
                      borderBottom: "1px solid #f3f4f6",
                      transition: "background-color 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      if (lang !== l.code) e.currentTarget.style.backgroundColor = "#f9fafb";
                    }}
                    onMouseLeave={(e) => {
                      if (lang !== l.code) e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <span style={{ fontWeight: "bold", fontSize: "16px", minWidth: "30px", textAlign: "center" }}>
                      {l.code}
                    </span>
                    <span style={{ fontSize: "15px", color: lang === l.code ? "#16a34a" : "#6b7280" }}>
                      {l.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </nav>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        width: "100%",
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "30px 40px",
        boxSizing: "border-box",
        animation: "fadeIn 0.3s ease-out"
      }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/crops" element={<CropsPage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/iot" element={<IoTPage />} />
          <Route path="/chat" element={<ChatPage />} />
        </Routes>
      </main>
    </div>
  );
}
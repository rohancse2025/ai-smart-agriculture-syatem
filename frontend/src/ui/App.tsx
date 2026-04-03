import { useState, useEffect, useRef } from "react";
import { Routes, Route, useNavigate, useLocation, Link } from "react-router-dom";
import HomePage from "./pages/HomePage";
import CropsPage from "./pages/CropsPage";
import ScanPage from "./pages/ScanPage";
import IoTPage from "./pages/IoTPage";
import ChatPage from "./pages/ChatPage";
import MarketPage from "./pages/MarketPage";
import ProfilePage from "./pages/ProfilePage";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // DARK MODE STATE & LOGIC
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleDarkMode = () => setIsDark(!isDark);

  // LANGUAGE DROP-DOWN Logic
  const [lang, setLang] = useState("EN");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/crops", label: "Crops" },
    { path: "/scan", label: "Scan" },
    { path: "/iot", label: "IoT" },
    { path: "/market", label: "Market" },
    { path: "/chat", label: "Chat" },
  ];

  const languages = [
    { code: "EN", name: "English" },
    { code: "हि", name: "Hindi" },
    { code: "मर", name: "Marathi" },
  ];

  const isChatPage = location.pathname === "/chat";

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-slate-900 transition-colors duration-300 font-sans">
      
      {/* 1. TOP NAVBAR */}
      <nav className={`sticky top-0 z-[100] h-20 px-6 md:px-12 flex items-center justify-between transition-all duration-300 animate-slide-down ${scrolled ? 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-md border-b border-gray-100 dark:border-slate-700' : 'bg-transparent border-transparent'}`}>
        {/* LEFT: LOGO */}
        <Link 
          to="/" 
          className="flex items-center gap-2.5 no-underline group"
          onClick={() => setShowMobileMenu(false)}
        >
          <span className="text-2xl animate-bounce group-hover:animate-none group-hover:rotate-12 transition-transform">🌿</span>
          <span className="text-green-600 dark:text-green-500 font-black text-xl md:text-2xl tracking-tight">
            KisanCore AI
          </span>
        </Link>

        {/* RIGHT: LINKS + UTILITIES */}
        <div className="flex items-center gap-8">
          
          {/* DESKTOP NAV LINKS */}
          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-[13px] font-black uppercase tracking-widest no-underline transition-all relative group/link
                  ${location.pathname === link.path 
                    ? 'text-green-600' 
                    : 'text-gray-400 hover:text-green-600 dark:text-slate-400 dark:hover:text-green-400'}
                `}
              >
                {link.label}
                {location.pathname === link.path && (
                  <div className="absolute -bottom-1 left-0 h-0.5 bg-green-600 rounded-full animate-grow-width" />
                )}
              </Link>
            ))}
          </div>

          {/* UTILITIES: DARK TOGGLE + LANG */}
          <div className="flex items-center gap-4">
            {/* DARK TOGGLE */}
            <button 
              onClick={toggleDarkMode}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="w-10 h-10 rounded-full bg-gray-50 dark:bg-slate-700/50 flex items-center justify-center text-xl mb-1 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer transition-colors ripple"
            >
              {isDark ? "🌞" : "🌙"}
            </button>

            {/* LANG SELECTOR (Desktop Only) */}
            <div ref={dropdownRef} className="relative hidden md:block pl-0">
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 cursor-pointer hover:border-green-600 dark:hover:border-green-500 flex items-center gap-2 transition-all ripple"
              >
                <span className="text-xs">🌐</span>
                <span className="font-bold text-xs text-gray-600 dark:text-slate-300">{lang}</span>
                <span className="text-[10px] opacity-50 ml-1">▾</span>
              </button>
              
              {showDropdown && (
                <div className="absolute top-full right-0 mt-2 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col z-[1000] animate-fade-in">
                  {languages.map((l) => (
                    <div
                      key={l.code}
                      onClick={() => { setLang(l.code); setShowDropdown(false); }}
                      className={`p-3 text-xs font-bold cursor-pointer transition-colors ${lang === l.code ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                    >
                      {l.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* INSTALL BUTTON (Desktop) */}
            {deferredPrompt && (
              <button 
                onClick={handleInstallClick}
                className="hidden md:flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-xs font-black transition-all shadow-lg shadow-green-600/20 active:scale-95"
              >
                📲 Install App
              </button>
            )}

            {/* MOBILE MENU TOGGLE */}
            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden w-10 h-10 flex flex-col justify-center items-center gap-1.5 cursor-pointer bg-transparent border-none outline-none pl-0 mt-2"
            >
              <div className={`h-0.5 w-6 bg-green-600 rounded-full transition-all ${showMobileMenu ? 'rotate-45 translate-y-2' : ''}`} />
              <div className={`h-0.5 w-6 bg-green-600 rounded-full transition-all ${showMobileMenu ? 'opacity-0' : ''}`} />
              <div className={`h-0.5 w-6 bg-green-600 rounded-full transition-all ${showMobileMenu ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE MENU OVERLAY */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 top-20 z-[90] bg-white dark:bg-slate-900 animate-fade-in pl-0 mt-2 border-t border-gray-100 dark:border-slate-800">
          <div className="p-8 flex flex-col gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setShowMobileMenu(false)}
                className={`text-2xl font-black no-underline tracking-tighter
                  ${location.pathname === link.path ? 'text-green-600' : 'text-gray-400 dark:text-slate-500'}
                `}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-8 pt-8 border-t border-gray-100 dark:border-slate-800">
               <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Select Language</p>
               <div className="flex gap-4">
                 {languages.map(l => (
                   <button 
                    key={l.code}
                    onClick={() => { setLang(l.code); setShowMobileMenu(false); }}
                    className={`py-2 px-4 rounded-full text-sm font-bold border transition-all ${lang === l.code ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 dark:border-slate-700 text-gray-500'}`}
                   >
                     {l.name}
                   </button>
                 ))}
               </div>
            </div>

            {/* INSTALL BUTTON (Mobile) */}
            {deferredPrompt && (
              <button 
                onClick={handleInstallClick}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-green-600 text-white py-4 rounded-2xl text-lg font-black shadow-lg"
              >
                📲 Install App
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. MAIN CONTENT AREA */}
      <main className="transition-all duration-300">
        <div 
          key={location.pathname}
          className={`max-w-[1200px] mx-auto p-5 md:px-12 md:py-8 transition-all animate-fade-in`}
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/crops" element={<CropsPage />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/iot" element={<IoTPage />} />
            <Route path="/market" element={<MarketPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </div>
      </main>

      {/* 4. FLOATING AI CHAT BUTTON */}
      {!isChatPage && (
        <button 
          onClick={() => navigate('/chat')}
          title="Ask AI Assistant"
          className={`fixed z-[999] bg-green-600 text-white rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center group pl-0
            ${isMobile ? 'bottom-24 right-6 w-14 h-14' : 'bottom-10 right-10 w-16 h-16'}
          `}
        >
          {/* Pulse Animation */}
          <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-25"></span>
          
          <svg xmlns="http://www.w3.org/2000/svg" width={isMobile ? "24" : "28"} height={isMobile ? "24" : "28"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          
          <div className="absolute right-full mr-4 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap hidden lg:block">
            Ask AI EXPERT
          </div>
        </button>
      )}
      
      {/* 5. FOOTER - HIDDEN ON CHAT PAGE */}
      {!isChatPage && (
        <footer className="border-t border-gray-100 dark:border-slate-800 py-16 px-8 text-center bg-white dark:bg-slate-900 pl-0">
          <div className="flex flex-col items-center gap-4">
             <span className="text-xl">🌿</span>
             <p className="text-sm font-black text-green-600 uppercase tracking-widest m-0">KisanCore AI</p>
             <p className="text-gray-400 text-xs m-0">© 2026 Developed with ❤️ for Smart Farmers</p>
          </div>
        </footer>
      )}
    </div>
  );
}
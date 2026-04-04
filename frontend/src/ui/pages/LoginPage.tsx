import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

export default function LoginPage({ lang, onLogin }: { lang: string, onLogin?: (user: any) => void }) {
  const { t } = useTranslation(lang);
  const [isRegister, setIsRegister] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '', phone: '', password: '', location: '', farm_size: '0'
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const STATES_DATA = [
    'Karnataka', 'Punjab', 'Maharashtra', 'Tamil Nadu', 'Gujarat', 'Uttar Pradesh', 'Rajasthan', 'Haryana', 'Andhra Pradesh', 'Telangana'
  ];

  const detectLocation = () => {
    setIsDetecting(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          const state = data.address.state || 'Punjab';
          const district = data.address.city || data.address.county || data.address.suburb || 'Ludhiana';
          setFormData(prev => ({ ...prev, location: `${state}, ${district}` }));
        } catch (err) {
          setError("Detection failed. Please select manually.");
        } finally {
          setIsDetecting(false);
        }
      }, () => {
        setError("Location access denied.");
        setIsDetecting(false);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const cleanPhone = formData.phone.trim().replace(/^(\+91|91|0)/, '').replace(/\s/g, '');
    
    if (cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit phone number.");
      setIsLoading(false);
      return;
    }

    const cleanPassword = formData.password.trim();

    const baseUrl = import.meta.env.VITE_API_URL || '';
    const endpoint = isRegister ? `${baseUrl}/api/v1/auth/register` : `${baseUrl}/api/v1/auth/login`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          phone: cleanPhone,
          password: cleanPassword,
          farm_size: parseFloat(formData.farm_size) || 0
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to authenticate");
      
      localStorage.setItem('kisancore_token', data.token);
      localStorage.setItem('kisancore_farmer', JSON.stringify(data.farmer));
      
      if (onLogin) onLogin(data.farmer);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 px-6 animate-fade-in">
      {/* Reverted Header: Simple Green Banner */}
      <div className="bg-green-600 max-w-md w-full mx-auto p-10 rounded-t-[2.5rem] text-white text-center shadow-lg">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-white/30 backdrop-blur-sm">🌿</div>
        <h1 className="text-3xl font-black m-0 mb-2">KisanCore AI</h1>
        <p className="opacity-90 font-bold m-0 uppercase tracking-widest text-[10px]">Smart Farming for Indian Farmers</p>
      </div>
      
      {/* Reversion: Simple White Card */}
      <div className="bg-white dark:bg-slate-800 rounded-b-[2.5rem] shadow-2xl overflow-hidden max-w-md w-full mx-auto border-x border-b border-gray-100 dark:border-slate-700">
        <div className="flex border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
          <button 
            className={`flex-1 py-5 font-black text-xs tracking-widest transition-all ${!isRegister ? 'text-green-600 bg-white dark:bg-slate-800 border-b-4 border-green-600' : 'text-gray-400'}`} 
            onClick={() => setIsRegister(false)}
          >
            {t('auth_login').toUpperCase()}
          </button>
          <button 
            className={`flex-1 py-5 font-black text-xs tracking-widest transition-all ${isRegister ? 'text-green-600 bg-white dark:bg-slate-800 border-b-4 border-green-600' : 'text-gray-400'}`} 
            onClick={() => setIsRegister(true)}
          >
            {t('auth_register').toUpperCase()}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 md:p-10">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-xs font-bold mb-6 text-center border border-red-100 dark:border-red-900/30">
              ⚠️ {error}
            </div>
          )}

          <div className="space-y-4">
            {isRegister && (
              <div>
                 <input 
                  placeholder={t('auth_full_name')} 
                  required 
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 px-5 py-4 rounded-xl font-bold focus:border-green-500 outline-none transition-all text-sm dark:text-white" 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                />
              </div>
            )}

            <div>
               <input 
                placeholder={t('auth_phone')} 
                type="tel"
                required 
                maxLength={10}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 px-5 py-4 rounded-xl font-bold focus:border-green-500 outline-none transition-all text-sm dark:text-white" 
                onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} 
                value={formData.phone}
              />
            </div>

            <div className="relative">
               <input 
                placeholder={t('auth_password')} 
                type={showPassword ? "text" : "password"} 
                required 
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 px-5 py-4 rounded-xl font-bold focus:border-green-500 outline-none transition-all text-sm dark:text-white pr-12" 
                onChange={(e) => setFormData({...formData, password: e.target.value})} 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-600 transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                )}
              </button>
            </div>

            {isRegister && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <select 
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 px-5 py-4 rounded-xl font-bold focus:border-green-500 outline-none transition-all text-sm dark:text-white"
                    onChange={(e) => setFormData({...formData, location: `${e.target.value}, ${formData.location.split(', ')[1] || ''}`})}
                    value={formData.location.split(', ')[0] || ''}
                  >
                    <option value="">Select State</option>
                    {STATES_DATA.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  
                  <input 
                    placeholder="Enter District" 
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 px-5 py-4 rounded-xl font-bold focus:border-green-500 outline-none transition-all text-sm dark:text-white" 
                    value={formData.location.split(', ')[1] || ''}
                    onChange={(e) => setFormData({...formData, location: `${formData.location.split(', ')[0] || ''}, ${e.target.value}`})} 
                  />
                </div>
                
                <button 
                  type="button" 
                  onClick={detectLocation}
                  className="w-full bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 py-3 rounded-xl border border-blue-100 dark:border-blue-800 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {isDetecting ? 'Detecting...' : '📍 Auto-Detect My Location'}
                </button>
                
                <input 
                  placeholder={t('auth_farm_size') + " (Acres)"} 
                  type="number" step="0.1" 
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 px-5 py-4 rounded-xl font-bold focus:border-green-500 outline-none transition-all text-sm dark:text-white" 
                  onChange={(e) => setFormData({...formData, farm_size: e.target.value})} 
                />
              </div>
            )}
          </div>

          <button 
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-green-600/20 shadow-green-600-30 transition-all active:scale-[0.98] mt-8 text-sm uppercase tracking-widest flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              isRegister ? t('auth_create_account') : t('auth_access_dashboard')
            )}
          </button>
          
          <div className="mt-8 text-center">
            <button 
              type="button" 
              onClick={() => navigate('/')} 
              className="text-gray-400 hover:text-green-600 font-black text-[10px] uppercase tracking-[0.2em] bg-transparent border-none transition-colors"
            >
               ← {t('app_continue_as_guest')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

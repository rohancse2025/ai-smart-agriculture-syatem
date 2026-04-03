import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

export default function ProfilePage({ lang }: { lang: string }) {
  const { t } = useTranslation(lang);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    location: '',
    farm_size: 0,
    farm_size_unit: 'acres',
    soil_type: '',
    primary_crop: '',
    irrigation_type: '',
    soil_ph: 6.5,
    nitrogen: 50.0,
    potassium: 40.0,
    sms_alerts_enabled: 'false',
    sms_phone: ''
  });

  useEffect(() => {
    const farmer = JSON.parse(localStorage.getItem('kisancore_farmer') || 'null');
    if (!farmer) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/v1/auth/profile?phone=${encodeURIComponent(farmer.phone)}`);
        if (res.ok) {
          const data = await res.json();
          setFormData({
            ...data,
            farm_size: data.farm_size || 0,
            soil_ph: data.soil_ph || 6.5,
            nitrogen: data.nitrogen || 50.0,
            potassium: data.potassium || 40.0,
          });
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('kisancore_farmer');
    navigate('/');
    window.location.reload();
  };

  const handleDelete = async () => {
    if (!window.confirm("⚠️ Are you absolutely sure? This will permanently delete your farm data, crop records, and profile history. This action cannot be undone.")) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/v1/auth/profile?phone=${encodeURIComponent(formData.phone)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        localStorage.removeItem('kisancore_farmer');
        navigate('/');
        window.location.reload();
      } else {
        const result = await res.json();
        alert(result.detail || "Failed to delete account");
      }
    } catch (err) {
      alert("Error deleting account. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    // Only send fields that the backend expects
    const updateData = {
      name: formData.name,
      location: formData.location,
      farm_size: formData.farm_size,
      farm_size_unit: formData.farm_size_unit,
      soil_type: formData.soil_type,
      primary_crop: formData.primary_crop,
      irrigation_type: formData.irrigation_type,
      soil_ph: formData.soil_ph,
      nitrogen: formData.nitrogen,
      potassium: formData.potassium,
      sms_alerts_enabled: formData.sms_alerts_enabled,
      sms_phone: formData.sms_phone
    };

    try {
      const res = await fetch(`/api/v1/auth/profile?phone=${encodeURIComponent(formData.phone)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const result = await res.json();

      if (res.ok) {
        localStorage.setItem('kisancore_farmer', JSON.stringify(result.farmer));
        setMessage({ text: 'Profile updated successfully!', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      } else {
        throw new Error(result.detail || "Failed to update profile");
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error updating profile. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-bold">{t('common_loading')}</p>
      </div>
    );
  }

  const isLoggedIn = !!localStorage.getItem('kisancore_farmer');

  if (!isLoggedIn) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6 animate-fade-in">
        <div className="bg-gradient-to-br from-green-600 to-teal-700 rounded-[3rem] p-12 text-center text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-10 left-10 text-6xl rotate-12">🌿</div>
            <div className="absolute bottom-10 right-10 text-6xl -rotate-12">🚜</div>
            <div className="absolute top-1/2 left-1/4 text-4xl opacity-20">🌾</div>
          </div>
          
          <div className="relative z-10">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center text-5xl mb-8 mx-auto shadow-inner border border-white/30">
              👨‍🌾
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
              Your Personal Farm <br />Identity Awaits 🚀
            </h1>
            <p className="text-green-50 text-xl font-medium mb-12 max-w-2xl mx-auto opacity-90 leading-relaxed">
              Join the KisanCore community to save your soil records, track crop history, and get SMS alerts tailored to your exact location.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-5 justify-center">
              <button 
                onClick={() => navigate('/login')}
                className="bg-white text-green-700 px-10 py-5 rounded-2xl font-black text-xl shadow-2xl hover:bg-green-50 transition-all active:scale-95"
              >
                Create Farm Profile 
              </button>
              <button 
                onClick={() => navigate('/')}
                className="bg-green-500/30 backdrop-blur-md border border-white/20 text-white px-10 py-5 rounded-2xl font-black text-xl hover:bg-green-500/40 transition-all"
              >
                Continue as Guest
              </button>
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
               <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
                  <p className="text-3xl mb-2">📊</p>
                  <p className="font-black text-sm uppercase tracking-widest mb-1">Yield Tracking</p>
                  <p className="text-xs text-green-100 opacity-80">Monitor your farm's growth season by season</p>
               </div>
               <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
                  <p className="text-3xl mb-2">🌤️</p>
                  <p className="font-black text-sm uppercase tracking-widest mb-1">Local Alerts</p>
                  <p className="text-xs text-green-100 opacity-80">Get weather warnings specific to your village</p>
               </div>
               <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
                  <p className="text-3xl mb-2">📜</p>
                  <p className="font-black text-sm uppercase tracking-widest mb-1">Soil History</p>
                  <p className="text-xs text-green-100 opacity-80">Keep a permanent digital record of your soil health</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button 
            onClick={() => navigate('/')}
            className="text-green-600 font-bold flex items-center gap-2 mb-2 hover:underline"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white m-0">{t('profile_title')}</h1>
        </div>
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-green-200 dark:border-green-800">
          👨‍🌾
        </div>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-xl font-bold text-center animate-fade-in ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {message.type === 'success' ? '✅' : '⚠️'} {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Section 1: Personal Info */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Personal Information</h3>
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-wider">Full Name</label>
              <input 
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-3.5 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500/20"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-wider">Phone (Primary)</label>
              <input 
                type="text"
                value={formData.phone}
                className="w-full bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-3.5 rounded-xl text-sm font-bold outline-none opacity-60 cursor-not-allowed"
                disabled
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-wider">Location (State/District)</label>
              <input 
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-3.5 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Farm Details */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Farm Details</h3>
          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-wider">Farm Size</label>
                <input 
                  type="number"
                  step="0.1"
                  value={formData.farm_size}
                  onChange={(e) => setFormData({...formData, farm_size: parseFloat(e.target.value) || 0})}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-3.5 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500/20"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-wider">Unit</label>
                <select 
                  value={formData.farm_size_unit}
                  onChange={(e) => setFormData({...formData, farm_size_unit: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-3.5 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500/20"
                >
                  <option value="acres">Acres</option>
                  <option value="hectares">Hectares</option>
                  <option value="bigha">Bigha</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-wider">Soil Type</label>
              <select 
                value={formData.soil_type}
                onChange={(e) => setFormData({...formData, soil_type: e.target.value})}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-3.5 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500/20"
              >
                <option value="">Select Soil Type</option>
                <option value="Alluvial">Alluvial</option>
                <option value="Black">Black (Regur)</option>
                <option value="Red">Red</option>
                <option value="Laterite">Laterite</option>
                <option value="Sandy">Sandy</option>
                <option value="Clayey">Clayey</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-wider">Primary Crop</label>
              <input 
                type="text"
                placeholder="e.g. Rice, Wheat"
                value={formData.primary_crop}
                onChange={(e) => setFormData({...formData, primary_crop: e.target.value})}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-3.5 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Soil Health */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Default Soil Health</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-wider">pH</label>
              <input 
                type="number" step="0.1"
                value={formData.soil_ph}
                onChange={(e) => setFormData({...formData, soil_ph: parseFloat(e.target.value) || 0})}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-3 rounded-xl text-xs font-bold outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-wider">N (mg/kg)</label>
              <input 
                type="number"
                value={formData.nitrogen}
                onChange={(e) => setFormData({...formData, nitrogen: parseFloat(e.target.value) || 0})}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-3 rounded-xl text-xs font-bold outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-wider">K (mg/kg)</label>
              <input 
                type="number"
                value={formData.potassium}
                onChange={(e) => setFormData({...formData, potassium: parseFloat(e.target.value) || 0})}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-3 rounded-xl text-xs font-bold outline-none"
              />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-4 italic font-medium">These values are used as defaults in the Soil Analysis tool.</p>
        </div>

        {/* Section 4: SMS Alerts */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">SMS Alerts (India)</h3>
          <div className="space-y-5">
            <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-900/50 p-4 rounded-2xl">
              <div>
                <p className="text-sm font-black text-gray-700 dark:text-gray-200 m-0">Enable SMS Alerts</p>
                <p className="text-[10px] text-gray-400 font-bold m-0 uppercase mt-0.5">Weather & Crop Warnings</p>
              </div>
              <button 
                type="button"
                onClick={() => setFormData({...formData, sms_alerts_enabled: formData.sms_alerts_enabled === 'true' ? 'false' : 'true'})}
                className={`w-14 h-8 rounded-full transition-all relative ${formData.sms_alerts_enabled === 'true' ? 'bg-green-600' : 'bg-gray-300 dark:bg-slate-600'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${formData.sms_alerts_enabled === 'true' ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>
            {formData.sms_alerts_enabled === 'true' && (
              <div className="animate-fade-in">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-wider">Alert Phone (e.g. 9876543210)</label>
                <input 
                  type="text"
                  placeholder="10-digit mobile number"
                  value={formData.sms_phone}
                  onChange={(e) => setFormData({...formData, sms_phone: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-3.5 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500/20"
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="md:col-span-2 flex gap-4 pt-4">
          <button 
            type="submit"
            disabled={saving}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-black py-4 rounded-2xl text-lg shadow-xl shadow-green-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {t('common_loading')}
              </>
            ) : t('profile_save')}
          </button>
          <button 
            type="button"
            onClick={() => navigate('/')}
            className="px-10 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 font-black rounded-2xl hover:bg-gray-200 transition-all"
          >
            {t('common_cancel')}
          </button>
        </div>

        {/* Danger Zone */}
        <div className="md:col-span-2 mt-12 pt-8 border-t border-gray-100 dark:border-slate-800">
           <h3 className="text-xs font-black text-red-500 uppercase tracking-widest mb-6">Danger Zone</h3>
           <div className="flex flex-col md:flex-row gap-4">
              <button 
                type="button"
                onClick={handleLogout}
                className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 font-black py-4 rounded-2xl hover:bg-gray-100 transition-all"
              >
                {t('profile_logout')}
              </button>
              <button 
                type="button"
                onClick={handleDelete}
                className="flex-1 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 font-black py-4 rounded-2xl hover:bg-red-100 transition-all"
              >
                {t('profile_delete')}
              </button>
           </div>
           <p className="text-[10px] text-gray-400 mt-4 text-center font-medium">Deleting your account will remove all crop data and history forever.</p>
        </div>

      </form>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

export default function LoginPage({ lang }: { lang: string }) {
  const { t } = useTranslation(lang);
  const [isRegister, setIsRegister] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '', phone: '', password: '', location: '', farm_size: '0'
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    const endpoint = isRegister ? '/api/v1/auth/register' : '/api/v1/auth/login';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          farm_size: parseFloat(formData.farm_size) || 0
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to fetch");
      
      localStorage.setItem('kisancore_token', data.token);
      localStorage.setItem('kisancore_farmer', JSON.stringify(data.farmer));
      navigate('/');
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-6">
      <div className="bg-green-600 w-full p-8 rounded-t-3xl text-white text-center shadow-md">
        <h1 className="text-3xl font-black mb-2">KisanCore AI</h1>
        <p className="opacity-80 font-bold">Smart Farming for Indian Farmers</p>
      </div>
      
      <div className="bg-white rounded-b-3xl shadow-xl overflow-hidden max-w-md w-full mx-auto">
        <div className="flex border-b border-gray-100">
          <button className={`flex-1 py-4 font-black ${!isRegister ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-400'}`} onClick={() => setIsRegister(false)}>{t('auth_login').toUpperCase()}</button>
          <button className={`flex-1 py-4 font-black ${isRegister ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-400'}`} onClick={() => setIsRegister(true)}>{t('auth_register').toUpperCase()}</button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pb-10">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold mb-4 text-center">⚠️ {error}</div>}

          {isRegister && (
            <div className="mb-4">
               <input placeholder="FullName" required className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl font-bold focus:border-green-500 outline-none" onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
          )}

          <div className="mb-4">
             <input placeholder={t('auth_phone')} required className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl font-bold focus:border-green-500 outline-none" onChange={(e) => setFormData({...formData, phone: e.target.value})} />
          </div>

          <div className="mb-4">
             <input placeholder={t('auth_password')} type="password" required className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl font-bold focus:border-green-500 outline-none" onChange={(e) => setFormData({...formData, password: e.target.value})} />
          </div>

          {isRegister && (
            <>
              <div className="mb-4">
                <input placeholder="Location (State/Dist)" className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl font-bold focus:border-green-500 outline-none" onChange={(e) => setFormData({...formData, location: e.target.value})} />
              </div>
              <div className="mb-4">
                <input placeholder="Farm Size (Acres)" type="number" step="0.1" className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl font-bold focus:border-green-500 outline-none" onChange={(e) => setFormData({...formData, farm_size: e.target.value})} />
              </div>
            </>
          )}

          <button className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl transition-all active:scale-[0.98] mt-4 box-shadow-md">
            {isRegister ? t('auth_create_account') : t('auth_access_dashboard')}
          </button>
        </form>
      </div>
    </div>
  );
}

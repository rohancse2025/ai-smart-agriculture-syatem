import { useState, useEffect } from 'react';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';

export default function OfflineBanner() {
  const { isOnline } = useOfflineStatus();
  const [show, setShow] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [backOnlineMsg, setBackOnlineMsg] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShow(true);
      setWasOffline(true);
      setBackOnlineMsg(false);
    } else if (isOnline && wasOffline) {
      // Transition from offline to online
      setBackOnlineMsg(true);
      const timer = setTimeout(() => {
        setShow(false);
        setWasOffline(false);
        setBackOnlineMsg(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isOnline, wasOffline]);

  if (!show) return null;

  return (
    <div 
      className={`fixed bottom-0 left-0 w-full z-[998] py-3.5 px-6 flex items-center justify-center gap-3 transition-all duration-500 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] 
        ${backOnlineMsg ? 'bg-green-600' : 'bg-amber-500'} 
        animate-slide-up-banner`}
    >
      <div className="flex items-center gap-3 text-white font-bold text-sm tracking-tight">
        {backOnlineMsg ? (
          <>
            <span className="text-xl">✅</span>
            <span>Back online! Reconnecting to AI services...</span>
          </>
        ) : (
          <>
            <span className="text-xl animate-pulse">📡</span>
            <span>You're offline — AI features (Chat & Crop) paused. Tap to retry.</span>
          </>
        )}
      </div>
      
      {!backOnlineMsg && (
        <button 
          onClick={() => window.location.reload()}
          className="bg-white/20 hover:bg-white/30 text-white border border-white/40 py-1 px-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors ml-4"
        >
          Retry
        </button>
      )}
    </div>
  );
}

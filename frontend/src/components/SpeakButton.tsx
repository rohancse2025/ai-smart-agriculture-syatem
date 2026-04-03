import React, { useState, useEffect } from 'react';
import { useSpeech } from '../hooks/useSpeech';

interface SpeakButtonProps {
  text: string;
  lang?: string;
  className?: string;
}

const SpeakButton: React.FC<SpeakButtonProps> = ({ text, lang = 'EN', className = "" }) => {
  const { speak, stop, isSpeaking } = useSpeech();
  const [active, setActive] = useState(false);

  // Sync state with global speech synthesis status
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isSpeaking() && active) {
        setActive(false);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [active, isSpeaking]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (active) {
      stop();
      setActive(false);
    } else {
      speak(text, lang);
      setActive(true);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 
        ${active 
          ? 'bg-emerald-100 text-emerald-600 ring-2 ring-emerald-500 shadow-sm' 
          : 'bg-gray-100 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600'
        } ${className}`}
      title={active ? "Stop" : "Listen"}
      aria-label={active ? "Stop" : "Listen"}
    >
      {active ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <rect x="6" y="6" width="8" height="8" rx="1" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 3.5a.5.5 0 00-.5.5v12a.5.5 0 001 0V4a.5.5 0 00-.5-.5zM7 6.5a.5.5 0 00-.5.5v6a.5.5 0 001 0V7a.5.5 0 00-.5-.5zM13 6.5a.5.5 0 00-.5.5v6a.5.5 0 001 0V7a.5.5 0 00-.5-.5zM4 8.5a.5.5 0 00-.5.5v3a.5.5 0 001 0V9a.5.5 0 00-.5-.5zM16 8.5a.5.5 0 00-.5.5v3a.5.5 0 001 0V9a.5.5 0 00-.5-.5z" />
          <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm2-1a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V5a1 1 0 00-1-1H5z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
};

export default SpeakButton;

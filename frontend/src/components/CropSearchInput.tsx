import React, { useState, useEffect, useRef } from 'react';
import { ALL_CROPS } from '../data/crops';

interface CropSearchInputProps {
  value: string;
  onChange: (crop: string) => void;
  placeholder?: string;
}

const CropSearchInput: React.FC<CropSearchInputProps> = ({ 
  value, 
  onChange, 
  placeholder = "Search or type crop name..." 
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter crops based on input
  useEffect(() => {
    if (value.length >= 2) {
      const filtered = ALL_CROPS.filter(crop => 
        crop.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8); // Max 8 suggestions
      setSuggestions(filtered);
      setShowDropdown(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  }, [value]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0) {
        e.preventDefault();
        onChange(suggestions[selectedIndex]);
        setShowDropdown(false);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => value.length >= 2 && setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-700 bg-white shadow-sm"
        />
        
        {/* Clear Button */}
        {value && (
          <button
            onClick={() => {
              onChange('');
              setSelectedIndex(-1);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
            title="Clear"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && suggestions.length > 0 && !(suggestions.length === 1 && suggestions[0].toLowerCase() === value.toLowerCase()) && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl max-h-64 overflow-auto border-t-0 rounded-t-none">
          {suggestions.map((crop, index) => (
            <li
              key={crop}
              onClick={() => {
                onChange(crop);
                setShowDropdown(false);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`px-4 py-2.5 cursor-pointer flex items-center transition-colors border-b last:border-0 border-gray-50 ${
                index === selectedIndex ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full mr-3 ${index === selectedIndex ? 'bg-emerald-500' : 'bg-gray-200'}`} />
              <span className="font-semibold">{crop}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CropSearchInput;

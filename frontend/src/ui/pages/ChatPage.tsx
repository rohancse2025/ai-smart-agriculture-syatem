import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
};

const INITIAL_MESSAGE: Message = {
  id: '1',
  text: "Hello! I'm KisanCore AI Assistant 🌾\nI can help you with:\n• Crop selection and planning\n• Disease identification\n• Soil and fertilizer advice\n• Irrigation guidance\n• Market and weather tips\nHow can I help you today?",
  sender: 'ai',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

const LANG_OPTIONS = [
  { code: 'EN', label: 'English', hint: 'Type in English', voice: 'en-IN' },
  { code: 'HI', label: 'हिंदी', hint: 'हिंदी में लिखें', voice: 'hi-IN' },
  { code: 'MR', label: 'मराठी', hint: 'मराठीत लिहा', voice: 'mr-IN' },
  { code: 'KN', label: 'ಕನ್ನಡ', hint: 'ಕನ್ನಡದಲ್ಲಿ ಬರೆಯಿರಿ', voice: 'kn-IN' },
  { code: 'TA', label: 'தமிழ்', hint: 'தமிழில் எழுதுங்கள்', voice: 'ta-IN' }
];

export default function ChatPage({ lang }: { lang: string }) {
  const { t } = useTranslation(lang);
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState((location.state as any)?.prefill || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [chatLang, setChatLang] = useState('EN');
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const speakText = (text: string) => {
    if (!autoSpeak || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#]/g, '').trim();
    if (!cleanText) return;
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    
    // Find voice matching select language
    const currentLang = LANG_OPTIONS.find(l => l.code === chatLang);
    const preferredLangCode = currentLang?.voice || 'en-IN';
    
    const preferredVoice = voices.find(v => v.lang.replace('_', '-') === preferredLangCode) || 
                           voices.find(v => v.lang.replace('_', '-') === 'hi-IN') ||
                           voices.find(v => v.lang.replace('_', '-') === 'en-IN') || 
                           voices[0];
                           
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition (MIC) is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    // Use select language for recognition
    const currentLang = LANG_OPTIONS.find(l => l.code === chatLang);
    recognition.lang = currentLang?.voice || 'en-IN'; 
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) setInput(finalTranscript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const questions = [
    t('chat_q_1'),
    t('chat_q_2'),
    t('chat_q_3'),
    t('chat_q_4'),
    t('chat_q_5'),
    t('chat_q_6')
  ];

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    try {
      const historyPayload = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));
      const response = await fetch("/api/v1/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.text, history: historyPayload })
      });
      if (!response.ok) throw new Error("API failed");
      if (!response.body) throw new Error("No readable stream");
      setIsLoading(false);
      const aiMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: aiMsgId, text: "", sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let finalAiText = "";
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || "";
        for (const part of parts) {
          if (part.startsWith('data: ')) {
            const dataStr = part.replace(/^data:\s*/, '').trim();
            if (dataStr === '[DONE]') continue;
            try {
               const parsed = JSON.parse(dataStr);
               if (parsed.content) {
                 finalAiText += parsed.content;
                 setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: finalAiText } : m));
               }
            } catch (e) {}
           }
        }
      }
      speakText(finalAiText);
    } catch (error) {
      const errorMsg = "I'm being set up. Please try again soon!";
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), text: errorMsg, sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      speakText(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  const handleLangChange = (code: string) => {
    const lang = LANG_OPTIONS.find(l => l.code === code);
    if (!lang) return;
    
    setChatLang(code);
    
    // Add system message for language change
    const systemMsg: Message = {
      id: `sys-${Date.now()}`,
      text: `🌐 Language changed to ${lang.label}. You can now type or speak in ${lang.label}.`,
      sender: 'ai',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, systemMsg]);
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden w-full border border-gray-100 dark:border-slate-800">
      
      {/* LEFT SIDEBAR (Fixed 350px) */}
      {!isMobile && (
        <div className="w-[350px] border-r border-gray-100 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 overflow-y-auto flex-shrink-0">
          <div className="p-8">
            <h2 className="m-0 mb-8 text-xl text-gray-900 dark:text-white font-black flex items-center gap-3">
              💡 Quick Questions
            </h2>
            
            <div className="flex flex-col gap-3.5 mb-12">
              {questions.map((q, idx) => (
                <div 
                  key={idx}
                  onClick={() => setInput(q)}
                  className="group py-4 px-5 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 border-l-4 border-l-[#16a34a] rounded-xl cursor-pointer text-[14px] text-gray-700 dark:text-slate-300 shadow-sm transition-all hover:bg-green-50/50 dark:hover:bg-green-900/10 hover-lift ripple font-bold"
                >
                  {q}
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 dark:border-slate-800 pt-8 mt-4.5">
              <h3 className="text-[12px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-6">
                TIPS FOR BETTER ANSWERS
              </h3>
              <ul className="list-none p-0 m-0 flex flex-col gap-4">
                {[
                  "Mention your crop name",
                  "Include your location",
                  "Describe the problem clearly"
                ].map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-[14px] text-gray-600 dark:text-slate-400 font-bold">
                    <span className="text-[#16a34a] text-lg">✓</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* RIGHT CHAT AREA */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 relative h-full">
        
        {/* Header */}
        <div className="py-5 px-8 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center text-3xl">🤖</div>
            <div>
              <h2 className="m-0 text-[#16a34a] text-lg font-black tracking-tight">
                {t('chat_title')}
              </h2>
              <p className="m-0 text-xs text-gray-400 dark:text-slate-500 font-bold">
                Powered by AI — Ask anything about farming
              </p>
            </div>
          </div>
          
          <div className="flex gap-4 items-center">
            {isMobile && (
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm border
                  ${showSidebar ? 'bg-[#16a34a] text-white border-[#16a34a]' : 'bg-gray-50 dark:bg-slate-800 text-gray-500 border-gray-100 dark:border-slate-700'}`}
              >
                💡
              </button>
            )}
            
            <button
              onClick={() => {
                setAutoSpeak(!autoSpeak);
                if (autoSpeak && window.speechSynthesis) window.speechSynthesis.cancel();
              }}
              className={`flex items-center gap-2 h-10 px-5 rounded-full text-xs font-black uppercase tracking-widest cursor-pointer transition-all border shadow-sm
                ${autoSpeak ? 'bg-[#16a34a] text-white border-[#16a34a]' : 'bg-white dark:bg-slate-800 text-gray-500 border-gray-100 dark:border-slate-700'}`}
            >
              {autoSpeak ? "Auto-speak ON" : "Auto-speak OFF"}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 scroll-smooth">
          {messages.map(msg => {
            const isUser = msg.sender === 'user';
            return (
            <div key={msg.id} className={`flex flex-col max-w-[80%] animate-fade-in-up ${isUser ? 'self-end items-end' : 'self-start items-start'}`}>
                <div className={`px-6 py-4 rounded-3xl text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap font-medium hover-lift transition-transform
                  ${isUser 
                    ? 'bg-[#16a34a] text-white rounded-br-none' 
                    : 'bg-green-50 dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-bl-none border border-gray-100 dark:border-slate-700'}`}>
                  {msg.text}
                </div>
                <div className={`flex items-center gap-2 mt-2 px-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className="text-[11px] text-gray-400 dark:text-slate-600 font-bold">
                    {msg.timestamp}
                  </span>
                  {isUser && chatLang !== 'EN' && (
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold border border-gray-200 dark:border-slate-700">
                      🌐 {LANG_OPTIONS.find(l => l.code === chatLang)?.label}
                    </span>
                  )}
                </div>
            </div>
            );
          })}
          
          {isLoading && (
            <div className="flex flex-col max-w-[80%] self-start animate-fade-in-up">
              <div className="bg-gray-50 dark:bg-slate-800 px-6 py-4 rounded-3xl rounded-bl-none border border-gray-100 dark:border-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full dot-bounce" style={{ animationDelay: '0s' }} />
                <span className="w-2 h-2 bg-green-500 rounded-full dot-bounce" style={{ animationDelay: '0.2s' }} />
                <span className="w-2 h-2 bg-green-500 rounded-full dot-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Language Pill Selector */}
        <div className="px-6 py-3 bg-gray-50/50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800 flex gap-2 flex-wrap items-center">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">Language:</span>
          {LANG_OPTIONS.map(opt => (
            <button
              key={opt.code}
              onClick={() => handleLangChange(opt.code)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all border
                ${chatLang === opt.code 
                   ? 'bg-[#16a34a] text-white border-[#16a34a] shadow-sm' 
                   : 'bg-white dark:bg-slate-800 text-gray-500 border-gray-100 dark:border-slate-700 hover:bg-green-50'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex gap-4 items-center">
          <button
            onClick={toggleListening}
            className={`w-12 h-12 rounded-full border-none flex items-center justify-center cursor-pointer transition-all flex-shrink-0 shadow-sm ripple
              ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={isListening ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" x2="12" y1="19" y2="22"></line>
            </svg>
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : (LANG_OPTIONS.find(l => l.code === chatLang)?.hint || t('chat_placeholder'))}
            className="flex-1 h-12 px-6 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-[15px] outline-none text-gray-800 dark:text-white transition-all focus-ring-green font-medium"
          />
          
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`w-12 h-12 rounded-full text-white border-none flex items-center justify-center cursor-pointer transition-all flex-shrink-0 shadow-lg ripple
              ${(!input.trim() || isLoading) ? 'bg-gray-200 dark:bg-slate-800 text-gray-400 cursor-not-allowed' : 'bg-[#16a34a] hover:bg-[#15803d] active:scale-95'}`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

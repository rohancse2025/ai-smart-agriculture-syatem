import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

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

export default function ChatPage() {
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState((location.state as any)?.prefill || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  
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
    // Warm up speech synthesis voices
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const speakText = (text: string) => {
    if (!autoSpeak || !('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel(); // Stop any currently playing audio

    // Remove markdown symbols that sound weird if spoken
    const cleanText = text.replace(/[*#]/g, '').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    
    // Auto-pick best available voice: Hindi > Indian English > generic Hindi fallback
    const preferredVoice = voices.find(v => v.lang.replace('_', '-') === 'hi-IN') || 
                           voices.find(v => v.lang.replace('_', '-') === 'en-IN') || 
                           voices.find(v => v.lang.startsWith('hi')) ||
                           voices[0];
                           
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition (MIC) is not supported in this browser. Please try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    // Default to en-US to transcribe in English by default
    recognition.lang = 'en-US'; 
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setInput(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const questions = [
    "Best crop for sandy soil?",
    "How to treat leaf blight?",
    "When should I irrigate?",
    "What fertilizer for wheat?",
    "How to improve soil pH?",
    "Signs of nitrogen deficiency?"
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

      const response = await fetch("http://127.0.0.1:8000/api/v1/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.text, history: historyPayload })
      });

      if (!response.ok) throw new Error("API failed");
      if (!response.body) throw new Error("No readable stream");

      setIsLoading(false); // Hide thinking indicator

      const aiMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: aiMsgId,
        text: "",
        sender: 'ai',
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
        id: (Date.now() + 1).toString(),
        text: errorMsg,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      speakText(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div style={{
      display: "flex",
      height: "calc(100vh - 130px)",
      background: "white",
      borderRadius: "16px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      overflow: "hidden",
      border: "1px solid #e5e7eb"
    }}>
      {/* LEFT PANEL (Hidden on mobile) */}
      {!isMobile && (
        <div style={{
          width: "350px",
          borderRight: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          padding: "24px",
          overflowY: "auto"
        }}>
          <h2 style={{ margin: "0 0 24px 0", fontSize: "20px", color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
            💡 Quick Questions
          </h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
            {questions.map((q, idx) => (
              <div 
                key={idx}
                onClick={() => setInput(q)}
                style={{
                  padding: "16px",
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderLeft: "4px solid #16a34a",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  color: "#374151",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  transition: "all 0.2s",
                  fontWeight: "500"
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                {q}
              </div>
            ))}
          </div>

          <div>
            <h3 style={{ fontSize: "12px", fontWeight: "bold", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "16px", marginTop: "0" }}>
              Tips for better answers
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                "Mention your crop name",
                "Include your location",
                "Describe the problem clearly"
              ].map((tip, idx) => (
                <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "14px", color: "#4b5563" }}>
                  <span style={{ color: "#16a34a", marginTop: "2px" }}>✓</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* RIGHT PANEL */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f9fafb", position: "relative" }}>
        
        {/* Header */}
        <div style={{ padding: isMobile ? "12px 15px" : "20px 24px", background: "white", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div>
              <h2 style={{ margin: "0 0 4px 0", fontSize: isMobile ? "16px" : "18px", color: "#16a34a", display: "flex", alignItems: "center", gap: "8px" }}>
                🤖 {isMobile ? "Assistant" : "KisanCore AI Assistant"}
              </h2>
              {!isMobile && (
                <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                  Powered by AI — Ask anything about farming
                </p>
              )}
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {isMobile && (
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                style={{
                  padding: "8px 12px", borderRadius: "20px",
                  background: showSidebar ? "#dcfce7" : "#f3f4f6",
                  color: showSidebar ? "#166534" : "#4b5563",
                  border: "1px solid", borderColor: showSidebar ? "#bbf7d0" : "#e5e7eb",
                  cursor: "pointer", fontSize: "12px", fontWeight: "600"
                }}
              >
                💡 Tips
              </button>
            )}
            
            <button
              onClick={() => {
                setAutoSpeak(!autoSpeak);
                if (autoSpeak && window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                }
              }}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: isMobile ? "8px" : "8px 12px", borderRadius: "20px",
                background: autoSpeak ? "#dcfce7" : "#f3f4f6",
                color: autoSpeak ? "#166534" : "#4b5563",
                border: "1px solid", borderColor: autoSpeak ? "#bbf7d0" : "#e5e7eb",
                cursor: "pointer", fontSize: "12px",
                fontWeight: "600", transition: "all 0.2s",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}
            >
              {autoSpeak ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  </svg>
                  {!isMobile && "Auto-speak ON"}
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <line x1="23" y1="9" x2="17" y2="15"></line>
                    <line x1="17" y1="9" x2="23" y2="15"></line>
                  </svg>
                  {!isMobile && "Auto-speak OFF"}
                </>
              )}
            </button>
          </div>

          {/* MOBILE TIPS DROPDOWN OVERLAY */}
          {isMobile && showSidebar && (
            <div style={{
              position: "absolute",
              top: "100%",
              right: "15px",
              marginTop: "8px",
              width: "280px",
              background: "white",
              borderRadius: "12px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              border: "1px solid #e5e7eb",
              zIndex: 100,
              padding: "20px",
              animation: "fadeIn 0.2s ease-out"
            }}>
              <h3 style={{ margin: "0 0 15px 0", fontSize: "16px", color: "#111827", fontWeight: "700" }}>💡 Quick Questions</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {questions.map((q, idx) => (
                  <div 
                    key={idx}
                    onClick={() => {
                      setInput(q);
                      setShowSidebar(false);
                    }}
                    style={{
                      padding: "10px 12px",
                      background: "#f9fafb",
                      borderRadius: "8px",
                      fontSize: "13px",
                      color: "#374151"
                    }}
                  >
                    {q}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
          {messages.map(msg => {
            const isUser = msg.sender === 'user';
            return (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignSelf: isUser ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                <div style={{
                  background: isUser ? "#16a34a" : "white",
                  color: isUser ? "white" : "#1f2937",
                  padding: "14px 18px",
                  borderRadius: "18px",
                  borderBottomRightRadius: isUser ? "4px" : "18px",
                  borderBottomLeftRadius: isUser ? "18px" : "4px",
                  border: isUser ? "none" : "1px solid #e5e7eb",
                  fontSize: "15px",
                  lineHeight: "1.5",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  whiteSpace: "pre-wrap"
                }}>
                  {msg.text}
                </div>
                <span style={{ fontSize: "11px", color: "#9ca3af", marginTop: "6px", alignSelf: isUser ? "flex-end" : "flex-start", padding: "0 4px" }}>
                  {msg.timestamp}
                </span>
              </div>
            );
          })}
          
          {isLoading && (
            <div style={{ display: "flex", flexDirection: "column", alignSelf: "flex-start", maxWidth: "80%" }}>
              <div style={{
                background: "white",
                color: "#6b7280",
                padding: "14px 18px",
                borderRadius: "18px",
                borderBottomLeftRadius: "4px",
                border: "1px solid #e5e7eb",
                fontSize: "15px",
                fontStyle: "italic",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}>
                <span style={{ display: "inline-block", animation: "pulse 1.5s infinite" }}>🌾</span>
                KisanCore AI is thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: "20px 24px", background: "white", borderTop: "1px solid #e5e7eb", display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            onClick={toggleListening}
            style={{
              width: "48px", height: "48px", borderRadius: "24px",
              background: isListening ? "#ef4444" : "#f3f4f6",
              color: isListening ? "white" : "#4b5563",
              border: "none", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.2s", flexShrink: 0,
              boxShadow: isListening ? "0 4px 12px rgba(239, 68, 68, 0.4)" : "none",
              animation: isListening ? "micPulse 1.5s infinite" : "none"
            }}
            title={isListening ? "Stop listening" : "Start speaking (Hindi/English)"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={isListening ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
            placeholder={isListening ? "Listening..." : "Ask your farming question..."}
            style={{
              flex: 1,
              padding: "14px 20px",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "24px",
              fontSize: "15px",
              outline: "none",
              color: "#1f2937",
              fontFamily: "inherit",
              transition: "border-color 0.2s"
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#16a34a"; e.currentTarget.style.background = "white"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "#f9fafb"; }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "24px",
              background: (!input.trim() || isLoading) ? "#9ca3af" : "#16a34a",
              color: "white",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: (!input.trim() || isLoading) ? "not-allowed" : "pointer",
              transition: "background-color 0.2s, transform 0.1s",
              flexShrink: 0
            }}
            onMouseDown={(e) => { if (input.trim() && !isLoading) e.currentTarget.style.transform = "scale(0.95)"; }}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes micPulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
}

export function useSpeech() {
  const speak = (text: string, lang?: string) => {
    if (!('speechSynthesis' in window)) return;
    
    // Stop any current speaking
    window.speechSynthesis.cancel();
    
    // Cleanup text - remove special characters/emojis for cleaner speech
    const clean = text.replace(/[*#🌾🌿💧🌡️]/g, '').trim();
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    
    // Language mapping for regional support
    const langMap: Record<string, string> = {
      'EN': 'en-IN', 
      'HI': 'hi-IN', 
      'MR': 'mr-IN', 
      'KN': 'kn-IN', 
      'TA': 'ta-IN'
    };
    
    const targetLang = langMap[lang || 'EN'] || 'en-IN';
    const voices = window.speechSynthesis.getVoices();
    
    // Find regional voice matching target language
    const voice = voices.find(v => v.lang.replace('_', '-') === targetLang) || 
                  voices.find(v => v.lang.startsWith(targetLang.split('-')[0])) || 
                  voices[0];
                  
    if (voice) utterance.voice = voice;
    
    // Slower rate for better clarity for elderly/rural users
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    
    window.speechSynthesis.speak(utterance);
  };
  
  const stop = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };
  
  const isSpeaking = () => {
    return 'speechSynthesis' in window ? window.speechSynthesis.speaking : false;
  };
  
  return { speak, stop, isSpeaking };
}

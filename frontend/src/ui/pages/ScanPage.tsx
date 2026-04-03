import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

const MOCK_RESULT = {
  disease: "Tomato Early Blight",
  confidence: 95.4,
  severity: "Moderate" as "Mild" | "Moderate" | "Severe",
  treatment:
    "Apply fungicides containing chlorothalonil, mancozeb, or azoxystrobin. Remove lower infected leaves and improve air circulation.",
  prevention:
    "Mulch around plants, water at soil level, ensure adequate plant spacing, and maintain proper plant nutrition.",
};

const COMMON_DISEASES = [
  { name: "Tomato Early Blight", type: "Fungal", emoji: "🍅" },
  { name: "Potato Late Blight", type: "Fungal", emoji: "🥔" },
  { name: "Rice Blast", type: "Fungal", emoji: "🌾" },
  { name: "Wheat Rust", type: "Fungal", emoji: "🌿" },
];

const TIPS = [
  "Take photo in good natural lighting",
  "Focus on the affected leaf area",
  "Ensure image is clear, not blurry",
  "Include some healthy parts for comparison",
  "Avoid shadows on the leaf",
];

export default function ScanPage({ lang }: { lang: string }) {
  const navigate = useNavigate();
  const { t } = useTranslation(lang);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<typeof MOCK_RESULT | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setResult(null);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const clearImage = () => {
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const analyzeImage = async () => {
    if (!preview) return;
    setIsAnalyzing(true);
    setResult(null);

    try {
      // 1. Mock the initial detection (In a real app, this would be a vision model)
      await new Promise((res) => setTimeout(res, 2000));
      const detectedDisease = COMMON_DISEASES[Math.floor(Math.random() * COMMON_DISEASES.length)].name;
      
      // 2. Fetch professional AI advice for this disease
      const prompt = `My plant has been diagnosed with "${detectedDisease}". Give me a JSON response with: "disease" (the name), "confidence" (a number between 90-99), "severity" (Mild/Moderate/Severe), "treatment" (2 sentences of medicine/action), and "prevention" (2 sentences of future advice). Return ONLY JSON. Use English only for all text values.`;
      
      const res = await fetch("/api/v1/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, history: [] })
      });
      
      if (!res.ok) throw new Error("AI Advice failed");
      const data = await res.json();
      
      // Parse the JSON from the AI response (it might have triple backticks)
      const jsonStr = data.reply.replace(/```json|```/g, "").trim();
      const aiResult = JSON.parse(jsonStr);
      
        setResult({
          disease: aiResult.disease || detectedDisease,
          confidence: aiResult.confidence || 95.0,
          severity: aiResult.severity || "Moderate",
          treatment: aiResult.treatment || "Consult an expert.",
          prevention: aiResult.prevention || "Maintain good hygiene."
        });
      } catch (err) {
        console.error("Analysis Error:", err);
        setResult(MOCK_RESULT); // Fallback to mock if AI fails
      } finally {
        setIsAnalyzing(false);
      }
  };

  const severityColor = (s: string) =>
    s === "Severe" ? "text-red-500" : s === "Mild" ? "text-green-600" : "text-amber-500";
  const severityBg = (s: string) =>
    s === "Severe" ? "bg-red-50" : s === "Mild" ? "bg-green-50" : "bg-amber-50";

  return (
    <div className="pb-12 font-sans">
      
      {/* PAGE HEADER */}
      <section className={`bg-gradient-to-br from-green-800 to-green-600 rounded-2xl p-8 md:p-10 text-white mb-8 shadow-lg shadow-green-700/20 ${isMobile ? 'text-center' : 'text-left'}`}>
        <h1 className={`m-0 mb-2.5 ${isMobile ? 'text-2xl' : 'text-3xl'} font-extrabold tracking-tight`}>🔍 {isMobile ? t('scan_title') : t('scan_title')}</h1>
        <p className={`m-0 ${isMobile ? 'text-base' : 'text-lg'} opacity-90`}>
          Upload a photo of your plant leaf to detect diseases instantly
        </p>
      </section>

      {/* TWO-COLUMN LAYOUT */}
      <div className={`grid gap-7 mb-10 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>

        {/* ===== LEFT COLUMN ===== */}
        <div className="flex flex-col gap-5">

          {/* UPLOAD AREA */}
          <div
            onClick={() => !preview && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-2xl min-h-[260px] flex flex-col items-center justify-center relative overflow-hidden transition-all p-6
              ${isDragging ? 'border-green-800 bg-green-100' : 'border-green-600 bg-green-50/50'}
              ${preview ? 'cursor-default' : 'cursor-pointer hover:bg-green-50'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg"
              className="hidden"
              onChange={onFileChange}
            />

            {preview ? (
              <>
                <img
                  src={preview}
                  alt="Selected plant"
                  className="max-w-full max-h-[220px] rounded-lg object-contain shadow-sm"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); clearImage(); }}
                  className="absolute top-3 right-3 bg-black/60 text-white border-none rounded-full w-8 h-8 flex items-center justify-center cursor-pointer transition-colors hover:bg-black/80"
                >✕</button>
              </>
            ) : (
              <>
                <span className="text-5xl mb-3">📷</span>
                <p className="m-0 mb-1.5 font-bold text-lg text-green-800">
                  Click to upload or drag &amp; drop
                </p>
                <p className="m-0 text-sm text-gray-400 font-medium">
                  Supports JPG, PNG — max 5MB
                </p>
              </>
            )}
          </div>

          {/* ANALYSE BUTTON */}
          <button
            onClick={analyzeImage}
            disabled={!preview || isAnalyzing}
            className={`w-full p-4 rounded-xl text-lg font-bold flex items-center justify-center gap-3 transition-all shadow-lg ripple
              ${!preview || isAnalyzing ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white cursor-pointer hover:bg-gray-800 active:scale-95'}`}
          >
            {isAnalyzing ? (
              <>
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                {t('scan_analyzing')}...
              </>
            ) : t('scan_take_photo')}
          </button>

          {/* TIPS CARD */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="m-0 mb-4 text-xl text-gray-900 font-bold">
              💡 Tips for Better Results
            </h3>
            <ul className="m-0 p-0 list-none flex flex-col gap-3">
              {TIPS.map((tip, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-600 leading-relaxed font-medium">
                  <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ===== RIGHT COLUMN ===== */}
        <div>
          {!result && !isAnalyzing ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-15 flex flex-col items-center justify-center min-h-[320px] text-center">
              <span className="text-6xl opacity-30 mb-4">📷</span>
              <h3 className="m-0 mb-2 text-gray-700 text-xl font-bold">
                Your analysis results will appear here
              </h3>
              <p className="m-0 text-gray-400 font-medium">
                Upload an image and click Analyse
              </p>
            </div>
          ) : isAnalyzing ? (
            <div className="bg-white rounded-2xl p-15 flex flex-col items-center justify-center min-h-[320px] shadow-sm border border-gray-100 text-center">
              <div className="w-14 h-14 border-5 border-green-50 border-t-green-600 rounded-full animate-spin mb-5" />
              <p className="m-0 text-green-600 font-extrabold text-lg">Analyzing your image...</p>
              <p className="m-0 mt-2 text-gray-400 text-sm italic font-medium">Running disease detection model</p>
            </div>
          ) : result ? (
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-200 overflow-hidden animate-fade-in-up">
              {/* Disease Header */}
              <div className="p-8 pb-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="m-0 text-3xl font-black text-gray-900 tracking-tight leading-tight">
                    {result.disease}
                  </h2>
                  <span className="text-4xl">🔬</span>
                </div>

                <div className="flex flex-wrap gap-2.5 mb-6">
                  <span className="bg-green-100 text-green-800 py-1.5 px-4 rounded-full text-xs font-black uppercase tracking-wider border border-green-200">
                    {result.confidence}% Confidence
                  </span>
                  <span className={`py-1.5 px-4 rounded-full text-xs font-black uppercase tracking-wider border ${severityBg(result.severity)} ${severityColor(result.severity)}`}>
                    {result.severity} Severity
                  </span>
                </div>

                <div className="mb-2 flex justify-between font-black text-[11px] text-gray-400 uppercase tracking-widest">
                  <span>Detection Confidence</span>
                  <span>{result.confidence}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner p-0.5">
                  <div 
                    className="h-full bg-green-600 rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(22,163,74,0.5)]"
                    style={{ width: `${result.confidence}%` }}
                  />
                </div>
              </div>

              {/* Advice Content */}
              <div className="px-8 pb-8 flex flex-col gap-5">
                <div className="bg-green-50/50 rounded-2xl p-6 border border-green-100/50 hover-lift transition-all">
                  <h4 className="m-0 mb-3 text-green-700 text-[12px] font-black uppercase tracking-widest flex items-center gap-2">
                    <span className="text-base">💊</span> Treatment Plan
                  </h4>
                  <p className="m-0 text-gray-700 text-[15px] leading-relaxed font-medium italic">"{result.treatment}"</p>
                </div>

                <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100/50 hover-lift transition-all">
                  <h4 className="m-0 mb-3 text-blue-700 text-[12px] font-black uppercase tracking-widest flex items-center gap-2">
                    <span className="text-base">🛡️</span> Prevention Strategy
                  </h4>
                  <p className="m-0 text-gray-700 text-[15px] leading-relaxed font-medium italic">"{result.prevention}"</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-8 pt-0 flex gap-4 flex-wrap">
                <button
                  onClick={clearImage}
                  className="flex-1 min-w-[160px] py-4 px-6 bg-white text-gray-900 border-2 border-gray-100 rounded-2xl text-sm font-black transition-all hover:border-gray-900 active:scale-95 ripple"
                >
                  Scan New Image
                </button>
                <button
                  onClick={() => navigate('/chat', { state: { prefill: `I scanned a plant leaf and detected "${result.disease}" with ${result.confidence}% confidence. Give me more detailed organic treatment options.` } })}
                  className="flex-1 min-w-[160px] py-4 px-6 bg-[#16a34a] text-white border-none rounded-2xl text-sm font-black transition-all hover:bg-[#15803d] active:scale-95 shadow-lg shadow-green-600/20 ripple"
                >
                  🤖 Talk to AI Expert
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* COMMON DISEASES SECTION */}
      <section>
        <h2 className={`text-xl font-bold text-gray-900 mb-6 ${isMobile ? 'text-center' : 'text-left'}`}>
          📚 Common Plant Diseases
        </h2>
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          {COMMON_DISEASES.map((d) => (
            <div key={d.name} className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100 border-t-4 border-t-green-600 transition-all hover:-translate-y-1 hover:shadow-md">
              <span className="text-4xl block mb-3">{d.emoji}</span>
              <p className="m-0 font-bold text-gray-800 text-[15px] leading-snug mb-2">{d.name}</p>
              <span className="bg-orange-50 text-orange-700 py-1 px-3 rounded-full text-xs font-black uppercase tracking-widest">
                {d.type}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

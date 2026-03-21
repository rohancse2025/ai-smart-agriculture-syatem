import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

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

export default function ScanPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // Simulate API delay — replace with real endpoint later
    await new Promise((res) => setTimeout(res, 2000));
    setResult(MOCK_RESULT);
    setIsAnalyzing(false);
  };

  const severityColor = (s: string) =>
    s === "Severe" ? "#ef4444" : s === "Mild" ? "#16a34a" : "#f59e0b";
  const severityBg = (s: string) =>
    s === "Severe" ? "#fee2e2" : s === "Mild" ? "#dcfce7" : "#fef3c7";

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", paddingBottom: "48px" }}>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* PAGE HEADER */}
      <section style={{
        background: "linear-gradient(135deg, #15803d 0%, #16a34a 100%)",
        borderRadius: "16px",
        padding: "40px",
        color: "white",
        marginBottom: "32px",
        boxShadow: "0 4px 15px rgba(21, 128, 61, 0.2)"
      }}>
        <h1 style={{ margin: "0 0 10px 0", fontSize: "34px", fontWeight: "800" }}>🔍 Plant Disease Scanner</h1>
        <p style={{ margin: 0, fontSize: "18px", opacity: 0.9 }}>
          Upload a photo of your plant leaf to detect diseases instantly
        </p>
      </section>

      {/* TWO-COLUMN LAYOUT */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "28px", marginBottom: "40px" }}>

        {/* ===== LEFT COLUMN ===== */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* UPLOAD AREA */}
          <div
            onClick={() => !preview && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            style={{
              border: `2px dashed ${isDragging ? "#15803d" : "#16a34a"}`,
              borderRadius: "12px",
              backgroundColor: isDragging ? "#dcfce7" : "#f0fdf4",
              minHeight: "260px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: preview ? "default" : "pointer",
              position: "relative",
              overflow: "hidden",
              transition: "background-color 0.2s",
              padding: "20px"
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg"
              style={{ display: "none" }}
              onChange={onFileChange}
            />

            {preview ? (
              <>
                <img
                  src={preview}
                  alt="Selected plant"
                  style={{ maxWidth: "100%", maxHeight: "220px", borderRadius: "8px", objectFit: "contain" }}
                />
                {/* Remove button */}
                <button
                  onClick={(e) => { e.stopPropagation(); clearImage(); }}
                  style={{
                    position: "absolute", top: "10px", right: "10px",
                    background: "rgba(0,0,0,0.6)", color: "white",
                    border: "none", borderRadius: "50%",
                    width: "30px", height: "30px",
                    fontSize: "16px", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    lineHeight: 1
                  }}
                >✕</button>
              </>
            ) : (
              <>
                <span style={{ fontSize: "48px", marginBottom: "12px" }}>📷</span>
                <p style={{ margin: "0 0 6px 0", fontWeight: "700", fontSize: "17px", color: "#15803d" }}>
                  Click to upload or drag &amp; drop
                </p>
                <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                  Supports JPG, PNG — max 5MB
                </p>
              </>
            )}
          </div>

          {/* ANALYSE BUTTON */}
          <button
            onClick={analyzeImage}
            disabled={!preview || isAnalyzing}
            style={{
              width: "100%",
              padding: "16px",
              backgroundColor: !preview || isAnalyzing ? "#9ca3af" : "#111827",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "17px",
              fontWeight: "bold",
              cursor: !preview || isAnalyzing ? "not-allowed" : "pointer",
              transition: "background-color 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              fontFamily: "inherit"
            }}
            onMouseEnter={(e) => { if (preview && !isAnalyzing) e.currentTarget.style.backgroundColor = "#374151"; }}
            onMouseLeave={(e) => { if (preview && !isAnalyzing) e.currentTarget.style.backgroundColor = "#111827"; }}
          >
            {isAnalyzing ? (
              <>
                <div style={{
                  width: "20px", height: "20px",
                  border: "3px solid rgba(255,255,255,0.3)",
                  borderTop: "3px solid white",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite"
                }} />
                Analyzing...
              </>
            ) : "Analyse Image"}
          </button>

          {/* TIPS CARD */}
          <div style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
            border: "1px solid #f3f4f6"
          }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "17px", color: "#1f2937", fontWeight: "700" }}>
              💡 Tips for Better Results
            </h3>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "12px" }}>
              {TIPS.map((tip, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", color: "#4b5563", fontSize: "14px", lineHeight: "1.4" }}>
                  <span style={{ color: "#16a34a", fontWeight: "bold", fontSize: "16px", flexShrink: 0 }}>✓</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ===== RIGHT COLUMN ===== */}
        <div>
          {!result && !isAnalyzing ? (
            /* PLACEHOLDER */
            <div style={{
              backgroundColor: "#f9fafb",
              border: "2px dashed #d1d5db",
              borderRadius: "12px",
              padding: "60px 30px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "320px",
              textAlign: "center"
            }}>
              <span style={{ fontSize: "52px", opacity: 0.3, marginBottom: "16px" }}>📷</span>
              <h3 style={{ margin: "0 0 8px 0", color: "#9ca3af", fontSize: "20px", fontWeight: "700" }}>
                Your analysis results will appear here
              </h3>
              <p style={{ margin: 0, color: "#9ca3af", fontSize: "15px" }}>
                Upload an image and click Analyse
              </p>
            </div>
          ) : isAnalyzing ? (
            /* LOADING STATE */
            <div style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "60px 30px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "320px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
              border: "1px solid #f3f4f6",
              textAlign: "center"
            }}>
              <div style={{
                width: "52px", height: "52px",
                border: "5px solid #dcfce7",
                borderTop: "5px solid #16a34a",
                borderRadius: "50%",
                animation: "spin 0.9s linear infinite",
                marginBottom: "20px"
              }} />
              <p style={{ margin: 0, color: "#16a34a", fontWeight: "700", fontSize: "18px" }}>Analyzing your image...</p>
              <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: "14px" }}>Running disease detection model</p>
            </div>
          ) : result ? (
            /* RESULT CARD */
            <div style={{
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.07)",
              border: "1px solid #f3f4f6",
              overflow: "hidden",
              animation: "fadeUp 0.4s ease-out"
            }}>
              {/* a) Disease Header */}
              <div style={{ padding: "28px 28px 20px" }}>
                <h2 style={{ margin: "0 0 14px 0", fontSize: "24px", fontWeight: "800", color: "#111827" }}>
                  {result.disease}
                </h2>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "18px" }}>
                  {/* Confidence badge */}
                  <span style={{
                    backgroundColor: "#dcfce7", color: "#166534",
                    padding: "5px 14px", borderRadius: "20px",
                    fontSize: "13px", fontWeight: "700"
                  }}>
                    {result.confidence}% Confidence
                  </span>

                  {/* Severity badge */}
                  <span style={{
                    backgroundColor: severityBg(result.severity),
                    color: severityColor(result.severity),
                    padding: "5px 14px", borderRadius: "20px",
                    fontSize: "13px", fontWeight: "700"
                  }}>
                    {result.severity} Severity
                  </span>
                </div>

                {/* Confidence progress bar */}
                <div style={{ marginBottom: "4px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#6b7280" }}>
                  <span>Confidence</span>
                  <span>{result.confidence}%</span>
                </div>
                <div style={{ height: "8px", backgroundColor: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${result.confidence}%`,
                    backgroundColor: "#16a34a",
                    borderRadius: "4px",
                    transition: "width 0.8s ease-out"
                  }} />
                </div>
              </div>

              {/* b) Treatment */}
              <div style={{ margin: "0 28px 16px", backgroundColor: "#f0fdf4", borderRadius: "10px", padding: "18px 20px" }}>
                <h4 style={{ margin: "0 0 8px 0", color: "#15803d", fontSize: "15px", fontWeight: "700" }}>💊 Treatment</h4>
                <p style={{ margin: 0, color: "#374151", fontSize: "14px", lineHeight: "1.55" }}>{result.treatment}</p>
              </div>

              {/* c) Prevention */}
              <div style={{ margin: "0 28px 24px", backgroundColor: "#eff6ff", borderRadius: "10px", padding: "18px 20px" }}>
                <h4 style={{ margin: "0 0 8px 0", color: "#1e40af", fontSize: "15px", fontWeight: "700" }}>🛡️ Prevention</h4>
                <p style={{ margin: 0, color: "#374151", fontSize: "14px", lineHeight: "1.55" }}>{result.prevention}</p>
              </div>

              {/* d) Buttons */}
              <div style={{ padding: "0 28px 28px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button
                  onClick={clearImage}
                  style={{
                    flex: 1, minWidth: "140px",
                    padding: "12px 16px",
                    backgroundColor: "white", color: "#111827",
                    border: "2px solid #d1d5db", borderRadius: "8px",
                    fontSize: "15px", fontWeight: "600", cursor: "pointer",
                    transition: "border-color 0.2s", fontFamily: "inherit"
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#111827"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#d1d5db"}
                >
                  Analyse Another Image
                </button>
                <button
                  onClick={() => navigate('/chat', { state: { prefill: `I scanned a plant leaf and detected "${result.disease}" with ${result.confidence}% confidence and ${result.severity} severity. What should I do?` } })}
                  style={{
                    flex: 1, minWidth: "140px",
                    padding: "12px 16px",
                    backgroundColor: "#111827", color: "white",
                    border: "none", borderRadius: "8px",
                    fontSize: "15px", fontWeight: "600", cursor: "pointer",
                    transition: "background-color 0.2s", fontFamily: "inherit"
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = "#374151"}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "#111827"}
                >
                  🤖 Ask AI for Help
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* COMMON DISEASES SECTION */}
      <section>
        <h2 style={{ fontSize: "26px", fontWeight: "800", color: "#111827", margin: "0 0 20px 0" }}>
          📚 Common Plant Diseases
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          {COMMON_DISEASES.map((d) => (
            <div key={d.name} style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "22px 20px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
              border: "1px solid #f3f4f6",
              borderTop: "4px solid #16a34a",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "10px",
              transition: "transform 0.2s",
              cursor: "default"
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <span style={{ fontSize: "36px" }}>{d.emoji}</span>
              <p style={{ margin: 0, fontWeight: "700", color: "#1f2937", fontSize: "15px", lineHeight: "1.3" }}>{d.name}</p>
              <span style={{
                backgroundColor: "#fff7ed", color: "#c2410c",
                padding: "3px 12px", borderRadius: "12px",
                fontSize: "12px", fontWeight: "700"
              }}>
                {d.type}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

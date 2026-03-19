"use client";

export function Badge({ text, color = "#FF6B35", bg = "#FFF0EB" }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", color, background: bg, borderRadius: 4, padding: "2px 7px", textTransform: "uppercase" }}>
      {text}
    </span>
  );
}

export function StepDots({ current, total }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", margin: "0 0 28px" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ width: i === current ? 20 : 8, height: 8, borderRadius: 4, background: i === current ? "#FF6B35" : "#E0D9D0", transition: "all 0.3s ease" }} />
      ))}
    </div>
  );
}

export function NFIGauge({ score }) {
  const color = score > 65 ? "#EF4444" : score > 40 ? "#F59E0B" : "#4CAF82";
  const label = score > 65 ? "High Risk" : score > 40 ? "Moderate" : "Low Risk";
  return (
    <div style={{ textAlign: "center" }}>
      <svg width="120" height="70" viewBox="0 0 120 70">
        <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="#EEE8E0" strokeWidth="10" strokeLinecap="round" />
        <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(score / 100) * 157} 157`} />
        <text x="60" y="58" textAnchor="middle" fontSize="22" fontWeight="700" fill={color} fontFamily="serif">{score}</text>
      </svg>
      <div style={{ fontSize: 12, fontWeight: 600, color, marginTop: -4 }}>{label}</div>
      <div style={{ fontSize: 11, color: "#9B9589", marginTop: 2 }}>NFI Risk Score</div>
    </div>
  );
}

export const labelStyle = { display: "flex", flexDirection: "column", gap: 6 };
export const labelText  = { fontSize: 13, fontWeight: 600, color: "#1A1512" };
export const inputStyle = { padding: "11px 14px", borderRadius: 10, border: "1.5px solid #E0D9D0", fontSize: 14, color: "#1A1512", background: "#FAFAF8", outline: "none", fontFamily: "inherit", transition: "border 0.2s" };
export const ctaBtn     = { width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "#FF6B35", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "opacity 0.2s", letterSpacing: "0.01em" };

export const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Plus Jakarta Sans', sans-serif; }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes slideIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin    { to{transform:rotate(360deg)} }
  input:focus { border-color:#FF6B35 !important; box-shadow:0 0 0 3px rgba(255,107,53,0.12); }
  button:hover:not(:disabled) { filter: brightness(0.95); }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: #E0D9D0; border-radius: 2px; }
`;

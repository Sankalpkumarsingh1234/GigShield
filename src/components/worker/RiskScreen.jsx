"use client";
import { Badge, NFIGauge, ctaBtn } from "@/components/ui";

export default function RiskScreen({ data, onNext }) {
  const { name, platform, earnings, pinData, nfi, seasonal } = data;

  const factors = [
    { label: "Zone risk (pin-code NFI)", value: `+₹${Math.round((nfi / 100) * 12)}/wk`, color: nfi > 65 ? "#EF4444" : "#F59E0B" },
    { label: "Seasonal factor",          value: `+₹${seasonal}/wk`,                      color: "#F59E0B" },
    { label: "No prior claims bonus",    value: "−₹5/wk",                                color: "#4CAF82" },
    { label: "Platform (outdoor rider)", value: "Standard exposure",                      color: "#6B6258" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 6 }}><Badge text="Step 2 of 4" /></div>
      <h2 style={{ fontFamily: "serif", fontSize: 26, margin: "8px 0 4px", color: "#1A1512" }}>{name.split(" ")[0]}'s risk profile</h2>
      <p style={{ fontSize: 14, color: "#6B6258", marginBottom: 24 }}>Based on your pin code in {pinData.city}.</p>
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1, background: "#FAFAF8", border: "1px solid #E0D9D0", borderRadius: 14, padding: 16 }}>
          <NFIGauge score={nfi} />
        </div>
        <div style={{ flex: 1.4, display: "flex", flexDirection: "column", gap: 8 }}>
          {factors.map((f, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#FAFAF8", border: "1px solid #E0D9D0", borderRadius: 10 }}>
              <span style={{ fontSize: 11, color: "#6B6258" }}>{f.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: f.color }}>{f.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "12px 16px", background: "#FFF8F5", border: "1px solid #FFD4BE", borderRadius: 12, fontSize: 13, color: "#7C3D1F", marginBottom: 24 }}>
        <strong>{pinData.zone}</strong> had <strong>{Math.round(nfi * 0.4)} disruption days</strong> in the past 12 months.
        Workers here lose ~<strong>₹{Math.round(parseInt(earnings || 6000) * 0.24)}/month</strong> without coverage.
      </div>
      <button onClick={() => onNext(data)} style={{ ...ctaBtn }}>See my plan options →</button>
    </div>
  );
}

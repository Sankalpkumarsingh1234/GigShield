"use client";
import { useState } from "react";
import { calcHeatIndex } from "@/utils/premium";

export default function HeatStressCard() {
  const [temp, setTemp]         = useState(38);
  const [humidity, setHumidity] = useState(72);
  const feelsLike  = calcHeatIndex(temp, humidity);
  const triggered  = feelsLike >= 42;
  const color      = feelsLike >= 45 ? "#EF4444" : feelsLike >= 42 ? "#F59E0B" : "#4CAF82";

  return (
    <div style={{ padding: "14px", background: triggered ? "#FFF8F0" : "#FAFAF8", border: `1.5px solid ${triggered ? "#F59E0B" : "#E0D9D0"}`, borderRadius: 14, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>🌡 Heat Stress Index</div>
          <div style={{ fontSize: 11, color: "#9B9589" }}>Rothfusz formula · live simulation</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "serif", fontSize: 26, color }}>{feelsLike}°C</div>
          <div style={{ fontSize: 10, color: "#9B9589" }}>feels like</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {[
          { label: "Temperature", min: 28, max: 48, value: temp,     set: setTemp,     unit: "°C" },
          { label: "Humidity",    min: 20, max: 100, value: humidity, set: setHumidity, unit: "%" },
        ].map(({ label, min, max, value, set, unit }) => (
          <div key={label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B6258", marginBottom: 4 }}>
              <span>{label}</span><span style={{ fontWeight: 600, color: "#1A1512" }}>{value}{unit}</span>
            </div>
            <input type="range" min={min} max={max} value={value} onChange={e => set(+e.target.value)} style={{ width: "100%", accentColor: "#FF6B35" }} />
          </div>
        ))}
      </div>
      <div style={{ padding: "8px 12px", background: triggered ? "#FEF3C7" : "#F0FDF4", borderRadius: 8, fontSize: 12, color: triggered ? "#92400E" : "#166534" }}>
        {triggered
          ? `⚡ Trigger fired — feels-like ${feelsLike}°C exceeds 42°C threshold. Auto-payout initiated.`
          : `✓ Below threshold (${feelsLike}°C < 42°C) — no trigger yet.`}
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";

const STAGES = [
  { icon: "🛡", label: "GigShield verified trigger", sub: "Heavy Rainfall · Threshold crossed", color: "#FF6B35" },
  { icon: "⚡", label: "Routing payout",             sub: "NPCI UPI network · instant transfer", color: "#F59E0B" },
  { icon: "🏦", label: "Bank processing",            sub: "Axis Bank · authorization",          color: "#3B82F6" },
  { icon: "✅", label: "Credited to your UPI",       sub: "Transfer complete · 0.8s",           color: "#4CAF82" },
];

export default function UPIPaymentFlow({ amount, onComplete }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timings = [600, 1100, 900, 700];
    let total = 0;
    timings.forEach((t, i) => { total += t; setTimeout(() => setStage(i + 1), total); });
    setTimeout(onComplete, total + 800);
  }, []);

  return (
    <div style={{ padding: "16px", background: "#1A1512", borderRadius: 16, marginBottom: 14, animation: "slideIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: "#FF6B35", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🛵</div>
        <div>
          <div style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>GigShield Auto-Payout</div>
          <div style={{ color: "#9B8E84", fontSize: 10 }}>Parametric trigger detected</div>
        </div>
        <div style={{ marginLeft: "auto", fontFamily: "serif", fontSize: 22, color: "#4CAF82" }}>₹{amount}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {STAGES.map((s, i) => {
          const reached = stage >= i + 1;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, opacity: reached ? 1 : 0.35, transition: "opacity 0.4s" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: reached ? s.color : "#333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, transition: "background 0.4s" }}>
                {reached ? s.icon : "○"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: reached ? "#fff" : "#6B6258" }}>{s.label}</div>
                <div style={{ fontSize: 10, color: "#9B8E84" }}>{s.sub}</div>
              </div>
              {reached && stage === i + 1 && i < 3 && <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #4CAF82", borderTopColor: "transparent", animation: "spin 0.6s linear infinite" }} />}
              {stage > i + 1 && <span style={{ color: "#4CAF82", fontSize: 14 }}>✓</span>}
            </div>
          );
        })}
      </div>
      {stage >= 4 && (
        <div style={{ marginTop: 14, padding: "10px 12px", background: "#0D2818", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "#4CAF82", fontWeight: 700 }}>Transfer complete</div>
            <div style={{ fontSize: 10, color: "#4A7C5E" }}>Ref: GS{Date.now().toString().slice(-8)} · {new Date().toLocaleTimeString()}</div>
          </div>
          <div style={{ fontFamily: "serif", fontSize: 20, color: "#4CAF82" }}>₹{amount}</div>
        </div>
      )}
    </div>
  );
}

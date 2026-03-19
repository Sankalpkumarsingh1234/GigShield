"use client";
import { useState } from "react";
import { FRAUD_CASES } from "@/data/mockData";
import { Badge } from "@/components/ui";

export default function FraudScoreVisualiser() {
  const [expanded, setExpanded] = useState(null);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>🔍 Fraud Score Visualiser</div>
          <div style={{ fontSize: 11, color: "#9B9589" }}>Isolation Forest · 4-signal anomaly model</div>
        </div>
        <Badge text="AI Model" color="#7C3AED" bg="#EDE9FE" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {FRAUD_CASES.map(c => {
          const scoreColor = c.score > 75 ? "#EF4444" : c.score > 50 ? "#F59E0B" : "#4CAF82";
          const isOpen     = expanded === c.id;
          return (
            <div key={c.id} style={{ border: `1.5px solid ${isOpen ? scoreColor : "#E0D9D0"}`, borderRadius: 12, overflow: "hidden", transition: "border 0.2s" }}>
              <div onClick={() => setExpanded(isOpen ? null : c.id)} style={{ padding: "12px 14px", background: isOpen ? "#FAFAF8" : "#fff", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1A1512" }}>{c.id}</span>
                    <span style={{ fontSize: 11, color: "#9B9589" }}>· {c.worker} · {c.pin}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#6B6258", marginTop: 2 }}>{c.trigger}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ textAlign: "center" }}>
                    <svg width="48" height="32" viewBox="0 0 48 32">
                      <path d="M4 28 A20 20 0 0 1 44 28" fill="none" stroke="#EEE8E0" strokeWidth="5" strokeLinecap="round" />
                      <path d="M4 28 A20 20 0 0 1 44 28" fill="none" stroke={scoreColor} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(c.score / 100) * 63} 63`} />
                      <text x="24" y="26" textAnchor="middle" fontSize="10" fontWeight="700" fill={scoreColor}>{c.score}</text>
                    </svg>
                    <div style={{ fontSize: 9, color: "#9B9589", marginTop: -4 }}>fraud score</div>
                  </div>
                  <span style={{ fontSize: 12, color: "#9B9589" }}>{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>
              {isOpen && (
                <div style={{ padding: "12px 14px", borderTop: "1px solid #F5F0EB", background: "#FAFAF8" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6B6258", marginBottom: 8 }}>Signal breakdown</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {c.signals.map((s, i) => (
                      <div key={i}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ fontSize: 10 }}>{s.flag ? "🚩" : "✅"}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: s.flag ? "#EF4444" : "#1A1512" }}>{s.label}</span>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: s.value > 70 ? "#EF4444" : s.value > 40 ? "#F59E0B" : "#4CAF82" }}>{s.value}%</span>
                        </div>
                        <div style={{ height: 4, background: "#EEE8E0", borderRadius: 2, marginBottom: 3 }}>
                          <div style={{ width: `${s.value}%`, height: "100%", background: s.value > 70 ? "#EF4444" : s.value > 40 ? "#F59E0B" : "#4CAF82", borderRadius: 2, transition: "width 0.6s ease" }} />
                        </div>
                        <div style={{ fontSize: 10, color: "#9B9589" }}>{s.desc}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button style={{ flex: 1, padding: "7px", borderRadius: 8, border: "1px solid #FCA5A5", background: "#FEE2E2", color: "#991B1B", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🚫 Reject claim</button>
                    <button style={{ flex: 1, padding: "7px", borderRadius: 8, border: "1px solid #BBF7D0", background: "#DCFCE7", color: "#166534", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓ Override & approve</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

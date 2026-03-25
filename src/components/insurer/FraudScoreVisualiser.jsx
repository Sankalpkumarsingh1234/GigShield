"use client";
import { useState, useEffect } from "react";
import { FRAUD_CASES } from "@/data/mockData";
import { Badge } from "@/components/ui";

export default function FraudScoreVisualiser() {
  const [cases,    setCases]    = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    fetch("/api/fraud-cases")
      .then(r => r.json())
      .then(data => {
        if (data.cases && data.cases.length > 0) {
          setCases(data.cases.map(c => ({
            id:       c.case_id,
            worker:   c.worker_name,
            pin:      c.pin_code,
            trigger:  c.trigger_type,
            score:    c.fraud_score,
            signals:  typeof c.signals === "string" ? JSON.parse(c.signals) : c.signals,
            status:   c.status,
            date:     c.date,
          })));
        } else {
          setCases(FRAUD_CASES.map(c => ({ ...c, status: "pending" })));
        }
      })
      .catch(() => setCases(FRAUD_CASES.map(c => ({ ...c, status: "pending" }))));
  }, []);

  async function updateStatus(caseId, newStatus) {
    setUpdating(caseId);
    try {
      const res = await fetch("/api/fraud-cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId, status: newStatus }),
      });
      if (res.ok) {
        setCases(prev => prev.map(c =>
          c.id === caseId ? { ...c, status: newStatus } : c
        ));
        setExpanded(null);
      }
    } catch (e) {
      console.error("Update failed:", e);
    }
    setUpdating(null);
  }

  const RISK_META = {
    high:   { label: "High Risk",   scoreColor: c => c > 75 ? "#EF4444" : c > 50 ? "#F59E0B" : "#4CAF82" },
    medium: { label: "Medium Risk", scoreColor: c => "#F59E0B" },
    low:    { label: "Low Risk",    scoreColor: c => "#4CAF82" },
  };

  function scoreColor(s) {
    return s > 75 ? "#EF4444" : s > 50 ? "#F59E0B" : "#4CAF82";
  }

  const flagged   = (cases || []).filter(c => c.score > 75).length;
  const avgScore  = cases ? Math.round(cases.reduce((s, c) => s + c.score, 0) / cases.length) : 0;
  const pending   = (cases || []).filter(c => c.status === "pending").length;

  if (!cases) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180, color: "#9B9589", fontSize: 13 }}>
        Loading fraud model data...
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>🔍 Fraud Score Visualiser</div>
          <div style={{ fontSize: 11, color: "#9B9589" }}>Isolation Forest · 4-signal anomaly model · Live DB</div>
        </div>
        <Badge text="AI Model" color="#7C3AED" bg="#EDE9FE" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[
          { label: "High risk",    value: flagged,  color: "#EF4444", bg: "#FEE2E2" },
          { label: "Avg score",    value: avgScore, color: "#F59E0B", bg: "#FEF3C7" },
          { label: "Pending review", value: pending, color: "#7C3AED", bg: "#EDE9FE" },
        ].map((s, i) => (
          <div key={i} style={{ padding: "8px", background: s.bg, borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontFamily: "serif", fontSize: 20, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#1A1512" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {cases.map(c => {
          const sc     = scoreColor(c.score);
          const isOpen = expanded === c.id;
          const isDone = c.status === "approved" || c.status === "rejected";

          return (
            <div key={c.id} style={{ border: `1.5px solid ${isOpen ? sc : "#E0D9D0"}`, borderRadius: 12, overflow: "hidden", opacity: isDone ? 0.7 : 1, transition: "border 0.2s" }}>
              <div onClick={() => setExpanded(isOpen ? null : c.id)} style={{ padding: "12px 14px", background: isOpen ? "#FAFAF8" : "#fff", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1A1512" }}>{c.id}</span>
                    <span style={{ fontSize: 11, color: "#9B9589" }}>· {c.worker} · {c.pin}</span>
                    {isDone && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: c.status === "approved" ? "#166534" : "#991B1B", padding: "1px 6px", borderRadius: 6, background: c.status === "approved" ? "#DCFCE7" : "#FEE2E2" }}>
                        {c.status === "approved" ? "✓ Approved" : "✗ Rejected"}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#6B6258", marginTop: 2 }}>{c.trigger}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ textAlign: "center" }}>
                    <svg width="48" height="32" viewBox="0 0 48 32">
                      <path d="M4 28 A20 20 0 0 1 44 28" fill="none" stroke="#EEE8E0" strokeWidth="5" strokeLinecap="round" />
                      <path d="M4 28 A20 20 0 0 1 44 28" fill="none" stroke={sc} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(c.score / 100) * 63} 63`} />
                      <text x="24" y="26" textAnchor="middle" fontSize="10" fontWeight="700" fill={sc}>{c.score}</text>
                    </svg>
                    <div style={{ fontSize: 9, color: "#9B9589", marginTop: -4 }}>fraud score</div>
                  </div>
                  <span style={{ fontSize: 12, color: "#9B9589" }}>{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>
              {isOpen && (
                <div style={{ padding: "12px 14px", borderTop: "1px solid #F5F0EB", background: "#FAFAF8" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6B6258", marginBottom: 8 }}>Signal breakdown · Isolation Forest model</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(c.signals || []).map((s, i) => (
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
                  {!isDone && (
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button
                        onClick={() => updateStatus(c.id, "rejected")}
                        disabled={!!updating}
                        style={{ flex: 1, padding: "7px", borderRadius: 8, border: "1px solid #FCA5A5", background: updating === c.id ? "#F5F0EB" : "#FEE2E2", color: "#991B1B", fontSize: 12, fontWeight: 700, cursor: updating ? "wait" : "pointer" }}>
                        🚫 Reject claim
                      </button>
                      <button
                        onClick={() => updateStatus(c.id, "approved")}
                        disabled={!!updating}
                        style={{ flex: 1, padding: "7px", borderRadius: 8, border: "1px solid #BBF7D0", background: updating === c.id ? "#F5F0EB" : "#DCFCE7", color: "#166534", fontSize: 12, fontWeight: 700, cursor: updating ? "wait" : "pointer" }}>
                        ✓ Override & approve
                      </button>
                    </div>
                  )}
                  {isDone && (
                    <div style={{ marginTop: 10, padding: "8px", background: c.status === "approved" ? "#DCFCE7" : "#FEE2E2", borderRadius: 8, fontSize: 11, fontWeight: 600, color: c.status === "approved" ? "#166534" : "#991B1B", textAlign: "center" }}>
                      {c.status === "approved" ? "✓ Claim approved & payout released" : "✗ Claim rejected · No payout issued"}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

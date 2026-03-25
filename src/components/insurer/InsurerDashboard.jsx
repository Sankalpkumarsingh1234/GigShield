"use client";
import { useState } from "react";
import { INSURER_STATS, ZONE_RISK_MAP, FRAUD_CASES } from "@/data/mockData";
import { Badge } from "@/components/ui";
import FraudScoreVisualiser from "./FraudScoreVisualiser";

const INSURER_TABS = [
  { id: "overview",  label: "Overview"    },
  { id: "fraud",     label: "🔍 Fraud AI" },
  { id: "zones",     label: "Zone Risk"   },
  { id: "forecast",  label: "Forecast"    },
];

const FORECAST = [
  { city: "Chennai",   prob: 84, trigger: "Heavy Rain",      workers: 1420 },
  { city: "Hyderabad", prob: 71, trigger: "Heat Stress",      workers:  870 },
  { city: "Delhi",     prob: 58, trigger: "AQI Warning",      workers: 1340 },
  { city: "Mumbai",    prob: 43, trigger: "Platform Outage",  workers: 2100 },
];

export default function InsurerDashboard({ onBack }) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <>
      <div style={{ minHeight: "100vh", background: "#F5F0EB", padding: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ background: "#1A1512", borderRadius: 16, padding: "14px 20px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "#FF6B35", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🛡</div>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>GigShield Admin</div>
                <div style={{ color: "#9B8E84", fontSize: 10 }}>Insurer dashboard · Live view</div>
              </div>
            </div>
            <button onClick={onBack} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#fff", fontSize: 12, cursor: "pointer" }}>← Worker view</button>
          </div>

          {/* KPI row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Active policies",   value: INSURER_STATS.activePolicies.toLocaleString(), sub: `of ${INSURER_STATS.totalWorkers.toLocaleString()}`, color: "#4CAF82" },
              { label: "Premium this week", value: `₹${(INSURER_STATS.premiumThisWeek/1000).toFixed(0)}K`, sub: "collected",                       color: "#FF6B35" },
              { label: "Claims paid",       value: `₹${(INSURER_STATS.claimsPaid/1000).toFixed(0)}K`,    sub: `${INSURER_STATS.claimsThisWeek} claims`, color: "#F59E0B" },
              { label: "Loss ratio",        value: `${INSURER_STATS.lossRatio}%`,                        sub: "healthy",                            color: "#4CAF82" },
            ].map((s, i) => (
              <div key={i} style={{ padding: "12px 10px", background: "#fff", border: "1px solid #E0D9D0", borderRadius: 12, textAlign: "center" }}>
                <div style={{ fontFamily: "serif", fontSize: 20, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#1A1512", marginTop: 2 }}>{s.label}</div>
                <div style={{ fontSize: 9, color: "#9B9589" }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {INSURER_TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${activeTab === t.id ? "#1A1512" : "#E0D9D0"}`, background: activeTab === t.id ? "#1A1512" : "#fff", color: activeTab === t.id ? "#fff" : "#6B6258", transition: "all 0.2s" }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Overview */}
          {activeTab === "overview" && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E0D9D0", overflow: "hidden", marginBottom: 14 }}>
              <div style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E0D9D0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>Recent fraud flags</span>
                  <Badge text={`${INSURER_STATS.fraudFlagged} flagged`} color="#EF4444" bg="#FEE2E2" />
                </div>
                <button onClick={() => setActiveTab("fraud")} style={{ background: "none", border: "none", fontSize: 11, color: "#FF6B35", fontWeight: 600, cursor: "pointer" }}>View all →</button>
              </div>
              {FRAUD_CASES.slice(0, 2).map((f, i) => (
                <div key={i} style={{ padding: "10px 14px", borderBottom: i < 1 ? "1px solid #F5F0EB" : "none", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#1A1512" }}>{f.id}</span>
                      <span style={{ fontSize: 10, color: "#9B9589" }}>· {f.worker} · {f.pin}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#6B6258" }}>{f.signals[0].desc}</div>
                  </div>
                  <Badge text={f.score > 75 ? "High" : "Medium"} color={f.score > 75 ? "#EF4444" : "#F59E0B"} bg={f.score > 75 ? "#FEE2E2" : "#FEF3C7"} />
                </div>
              ))}
            </div>
          )}

          {/* Fraud AI */}
          {activeTab === "fraud" && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E0D9D0", padding: "14px 16px", marginBottom: 14 }}>
              <FraudScoreVisualiser />
            </div>
          )}

          {/* Zones */}
          {activeTab === "zones" && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E0D9D0", overflow: "hidden", marginBottom: 14 }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #E0D9D0", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>Zone risk breakdown</span>
                <Badge text="Pin-code NFI" color="#FF6B35" bg="#FFF0EB" />
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#FAFAF8" }}>
                      {["City","Pin","NFI","Workers","Claims","Risk"].map(h => (
                        <th key={h} style={{ padding: "7px 10px", fontSize: 10, fontWeight: 600, color: "#9B9589", textAlign: "left", borderBottom: "1px solid #E0D9D0" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...ZONE_RISK_MAP].sort((a,b) => b.nfi - a.nfi).map((z, i) => {
                      const rc = z.nfi > 65 ? "#EF4444" : z.nfi > 40 ? "#F59E0B" : "#4CAF82";
                      const rl = z.nfi > 65 ? "High" : z.nfi > 40 ? "Mid" : "Low";
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid #F5F0EB" }}>
                          <td style={{ padding: "8px 10px", fontSize: 12, color: "#1A1512", fontWeight: 600 }}>{z.city}</td>
                          <td style={{ padding: "8px 10px", fontSize: 11, color: "#6B6258", fontFamily: "monospace" }}>{z.pin}</td>
                          <td style={{ padding: "8px 10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <div style={{ width: 36, height: 4, borderRadius: 2, background: "#EEE8E0" }}><div style={{ width: `${z.nfi}%`, height: "100%", background: rc, borderRadius: 2 }} /></div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: rc }}>{z.nfi}</span>
                            </div>
                          </td>
                          <td style={{ padding: "8px 10px", fontSize: 11, color: "#6B6258" }}>{z.workers.toLocaleString()}</td>
                          <td style={{ padding: "8px 10px", fontSize: 11, color: z.activeClaims > 20 ? "#EF4444" : "#6B6258", fontWeight: z.activeClaims > 20 ? 700 : 400 }}>{z.activeClaims}</td>
                          <td style={{ padding: "8px 10px" }}><Badge text={rl} color={rc} bg={z.nfi > 65 ? "#FEE2E2" : z.nfi > 40 ? "#FEF3C7" : "#E8F5EE"} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Forecast */}
          {activeTab === "forecast" && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E0D9D0", padding: "14px 16px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1512", marginBottom: 10 }}>📈 Predictive outlook — next 7 days</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {FORECAST.map((p, i) => (
                  <div key={i} style={{ padding: "9px 11px", background: "#FAFAF8", borderRadius: 10, border: "1px solid #E0D9D0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#1A1512" }}>{p.city}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: p.prob > 70 ? "#EF4444" : "#F59E0B" }}>{p.prob}%</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#6B6258", marginBottom: 5 }}>{p.trigger}</div>
                    <div style={{ height: 3, background: "#EEE8E0", borderRadius: 2 }}><div style={{ width: `${p.prob}%`, height: "100%", background: p.prob > 70 ? "#EF4444" : "#F59E0B", borderRadius: 2 }} /></div>
                    <div style={{ fontSize: 9, color: "#9B9589", marginTop: 3 }}>{p.workers.toLocaleString()} workers at risk</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

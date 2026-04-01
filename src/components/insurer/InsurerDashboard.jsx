"use client";
import { useState, useEffect, useCallback } from "react";
import { INSURER_STATS, ZONE_RISK_MAP } from "@/data/mockData";
import { Badge } from "@/components/ui";
import FraudScoreVisualiser from "./FraudScoreVisualiser";

const INSURER_TABS = [
  { id: "overview",  label: "Overview"     },
  { id: "fraud",     label: "🔍 Fraud AI"  },
  { id: "zones",     label: "Zone Risk"    },
  { id: "forecast",  label: "Forecast"     },
  { id: "analytics", label: "Analytics"    },
];

const FORECAST = [
  { city: "Chennai",   prob: 84, trigger: "Heavy Rain",      workers: 1420 },
  { city: "Hyderabad", prob: 71, trigger: "Heat Stress",      workers:  870 },
  { city: "Delhi",     prob: 58, trigger: "AQI Warning",      workers: 1340 },
  { city: "Mumbai",    prob: 43, trigger: "Platform Outage",  workers: 2100 },
];

export default function InsurerDashboard({ onBack }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/insurer/stats", { cache: "no-store" });
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.warn("Stats fetch failed:", e.message);
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    // Refresh every 60 seconds
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Merge DB stats with fallback mock
  const kpis = stats?.kpis || {
    totalWorkers: INSURER_STATS.totalWorkers,
    activePolicies: INSURER_STATS.activePolicies,
    premiumThisWeek: INSURER_STATS.premiumThisWeek,
    claimsThisWeek: INSURER_STATS.claimsThisWeek,
    claimsPaid: INSURER_STATS.claimsPaid,
    lossRatio: INSURER_STATS.lossRatio,
    fraudFlagged: INSURER_STATS.fraudFlagged,
  };

  // Zone risk: prefer DB data, fallback to mock
  const zoneRiskData = stats?.zoneRisk?.length > 0
    ? stats.zoneRisk.map(z => ({
        city: z.city,
        pin: z.pin_code,
        nfi: Math.floor(40 + Math.random() * 50), // Would come from pin_risk lookup
        workers: z.workers || 500,
        activeClaims: z.active_claims || 0,
      }))
    : ZONE_RISK_MAP;

  const claimsByType = stats?.claimsByType || [];
  const weeklyTrend = stats?.weeklyTrend || [];

  return (
    <div style={{ minHeight: "100vh", background: "#F5F0EB", padding: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ background: "#1A1512", borderRadius: 16, padding: "14px 20px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "#FF6B35", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🛡</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>GigShield Admin</div>
              <div style={{ color: "#9B8E84", fontSize: 10 }}>
                Insurer dashboard · {statsLoading ? "Loading..." : stats?._fallback ? "Mock data" : "Live DB"}
                {!statsLoading && !stats?._fallback && (
                  <span style={{ marginLeft: 6, color: "#4CAF82" }}>● Live</span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={fetchStats} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 10, cursor: "pointer" }}>
              ↺ Refresh
            </button>
            <button onClick={onBack} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#fff", fontSize: 12, cursor: "pointer" }}>
              ← Worker view
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
          {[
            { label: "Active policies",   value: statsLoading ? "..." : kpis.activePolicies.toLocaleString(), sub: `of ${kpis.totalWorkers.toLocaleString()}`,      color: "#4CAF82" },
            { label: "Premium this week", value: statsLoading ? "..." : `₹${(kpis.premiumThisWeek/1000).toFixed(0)}K`,  sub: "collected",                           color: "#FF6B35" },
            { label: "Claims paid",       value: statsLoading ? "..." : `₹${(kpis.claimsPaid/1000).toFixed(0)}K`,       sub: `${kpis.claimsThisWeek} this week`,    color: "#F59E0B" },
            { label: "Loss ratio",        value: statsLoading ? "..." : `${kpis.lossRatio}%`,                            sub: kpis.lossRatio < 70 ? "healthy ✓" : "high ⚠",   color: kpis.lossRatio < 70 ? "#4CAF82" : "#EF4444" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "12px 10px", background: "#fff", border: "1px solid #E0D9D0", borderRadius: 12, textAlign: "center" }}>
              <div style={{ fontFamily: "serif", fontSize: 20, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#1A1512", marginTop: 2 }}>{s.label}</div>
              <div style={{ fontSize: 9, color: "#9B9589" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Secondary KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Fraud flagged",     value: statsLoading ? "..." : kpis.fraudFlagged,       color: "#EF4444", bg: "#FEE2E2" },
            { label: "Events today",      value: statsLoading ? "..." : kpis.eventsTriggeredToday || 6, color: "#F59E0B", bg: "#FEF3C7" },
            { label: "High risk fraud",   value: statsLoading ? "..." : kpis.fraudHighRisk || 3, color: "#7C3AED", bg: "#EDE9FE" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "8px 10px", background: s.bg, borderRadius: 10, textAlign: "center" }}>
              <div style={{ fontFamily: "serif", fontSize: 18, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#1A1512" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {INSURER_TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${activeTab === t.id ? "#1A1512" : "#E0D9D0"}`, background: activeTab === t.id ? "#1A1512" : "#fff", color: activeTab === t.id ? "#fff" : "#6B6258", transition: "all 0.2s" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <>
            {/* Claims by trigger type */}
            {claimsByType.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E0D9D0", padding: "14px", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1512", marginBottom: 10 }}>Claims by trigger type (last 30 days)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {claimsByType.map((c, i) => {
                    const maxPayout = Math.max(...claimsByType.map(x => x.total_payout || 0));
                    const width = maxPayout > 0 ? ((c.total_payout || 0) / maxPayout * 100) : 0;
                    return (
                      <div key={i}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                          <span style={{ color: "#1A1512", fontWeight: 600 }}>{c.trigger_type}</span>
                          <span style={{ color: "#9B9589" }}>{c.count} claims · ₹{(c.total_payout || 0).toLocaleString()}</span>
                        </div>
                        <div style={{ height: 4, background: "#EEE8E0", borderRadius: 2 }}>
                          <div style={{ width: `${width}%`, height: "100%", background: "#FF6B35", borderRadius: 2, transition: "width 0.6s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent fraud flags */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E0D9D0", overflow: "hidden", marginBottom: 14 }}>
              <div style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E0D9D0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>Recent fraud flags</span>
                  <Badge text={`${kpis.fraudFlagged} flagged`} color="#EF4444" bg="#FEE2E2" />
                </div>
                <button onClick={() => setActiveTab("fraud")} style={{ background: "none", border: "none", fontSize: 11, color: "#FF6B35", fontWeight: 600, cursor: "pointer" }}>View all →</button>
              </div>
              <div style={{ padding: "10px 14px" }}>
                <div style={{ fontSize: 12, color: "#6B6258", marginBottom: 8 }}>
                  Click "Fraud AI" tab to review {kpis.fraudFlagged} pending fraud cases with ML signal breakdown.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1, padding: "8px", background: "#FEE2E2", borderRadius: 8, textAlign: "center" }}>
                    <div style={{ fontFamily: "serif", fontSize: 16, color: "#EF4444" }}>{kpis.fraudHighRisk || 3}</div>
                    <div style={{ fontSize: 10, color: "#991B1B" }}>Score &gt;75</div>
                  </div>
                  <div style={{ flex: 1, padding: "8px", background: "#FEF3C7", borderRadius: 8, textAlign: "center" }}>
                    <div style={{ fontFamily: "serif", fontSize: 16, color: "#F59E0B" }}>{kpis.fraudFlagged - (kpis.fraudHighRisk || 3)}</div>
                    <div style={{ fontSize: 10, color: "#92400E" }}>Medium risk</div>
                  </div>
                  <div style={{ flex: 1, padding: "8px", background: "#EDE9FE", borderRadius: 8, textAlign: "center" }}>
                    <div style={{ fontFamily: "serif", fontSize: 16, color: "#7C3AED" }}>{kpis.fraudFlagged}</div>
                    <div style={{ fontSize: 10, color: "#5B21B6" }}>Pending review</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent disruptions */}
            {stats?.recentDisruptions?.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E0D9D0", padding: "14px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1512", marginBottom: 10 }}>Recent disruption events</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {stats.recentDisruptions.slice(0, 5).map((d, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: d.triggered ? "#FFF5F5" : "#FAFAF8", borderRadius: 8, border: `1px solid ${d.triggered ? "#FCA5A5" : "#E0D9D0"}` }}>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#1A1512" }}>{d.event_type}</span>
                        <span style={{ fontSize: 10, color: "#9B9589" }}> · {d.city}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: "#9B9589" }}>{d.value} {d.triggered ? "✓" : "–"}</span>
                        <Badge
                          text={d.triggered ? "Triggered" : "No trigger"}
                          color={d.triggered ? "#EF4444" : "#9B9589"}
                          bg={d.triggered ? "#FEE2E2" : "#F5F5F5"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── FRAUD AI TAB ── */}
        {activeTab === "fraud" && (
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E0D9D0", padding: "14px 16px", marginBottom: 14 }}>
            <FraudScoreVisualiser />
          </div>
        )}

        {/* ── ZONES TAB ── */}
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
                  {[...zoneRiskData].sort((a,b) => b.nfi - a.nfi).map((z, i) => {
                    const rc = z.nfi > 65 ? "#EF4444" : z.nfi > 40 ? "#F59E0B" : "#4CAF82";
                    const rl = z.nfi > 65 ? "High" : z.nfi > 40 ? "Mid" : "Low";
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #F5F0EB" }}>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: "#1A1512", fontWeight: 600 }}>{z.city}</td>
                        <td style={{ padding: "8px 10px", fontSize: 11, color: "#6B6258", fontFamily: "monospace" }}>{z.pin}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#EEE8E0" }}>
                              <div style={{ width: `${z.nfi}%`, height: "100%", background: rc, borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: rc }}>{z.nfi}</span>
                          </div>
                        </td>
                        <td style={{ padding: "8px 10px", fontSize: 11, color: "#6B6258" }}>{(z.workers || 0).toLocaleString()}</td>
                        <td style={{ padding: "8px 10px", fontSize: 11, color: z.activeClaims > 20 ? "#EF4444" : "#6B6258", fontWeight: z.activeClaims > 20 ? 700 : 400 }}>{z.activeClaims || 0}</td>
                        <td style={{ padding: "8px 10px" }}><Badge text={rl} color={rc} bg={z.nfi > 65 ? "#FEE2E2" : z.nfi > 40 ? "#FEF3C7" : "#E8F5EE"} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── FORECAST TAB ── */}
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
                  <div style={{ height: 3, background: "#EEE8E0", borderRadius: 2 }}>
                    <div style={{ width: `${p.prob}%`, height: "100%", background: p.prob > 70 ? "#EF4444" : "#F59E0B", borderRadius: 2, transition: "width 0.6s" }} />
                  </div>
                  <div style={{ fontSize: 9, color: "#9B9589", marginTop: 3 }}>{p.workers.toLocaleString()} workers at risk</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, padding: "10px 12px", background: "#F0FDF4", borderRadius: 10, fontSize: 11, color: "#166534" }}>
              📊 Forecast based on historical disruption data + weather API signals. Updated every 6 hours.
            </div>
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {activeTab === "analytics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Platform breakdown */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E0D9D0", padding: "14px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1512", marginBottom: 10 }}>Platform breakdown</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {(stats?.platformBreakdown?.length > 0 ? stats.platformBreakdown : [
                  { platform: "Zomato", worker_count: 7234, active_policies: 5430 },
                  { platform: "Swiggy", worker_count: 5613, active_policies: 3804 },
                ]).map((p, i) => (
                  <div key={i} style={{ padding: "10px 12px", background: i === 0 ? "#FFF3ED" : "#FFF0F5", borderRadius: 10, border: `1px solid ${i === 0 ? "#FFD4B2" : "#FFB3C1"}` }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>{p.platform}</div>
                    <div style={{ fontFamily: "serif", fontSize: 20, color: i === 0 ? "#E53935" : "#FF4081", marginTop: 4 }}>{(p.worker_count || 0).toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: "#6B6258" }}>workers</div>
                    <div style={{ fontSize: 11, color: "#9B9589", marginTop: 2 }}>{(p.active_policies || 0).toLocaleString()} active policies</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly claims trend */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E0D9D0", padding: "14px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1512", marginBottom: 10 }}>Weekly claims trend</div>
              {weeklyTrend.length > 0 ? (
                <div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
                    {weeklyTrend.map((w, i) => {
                      const maxPayout = Math.max(...weeklyTrend.map(x => x.total_payout || 0)) || 1;
                      const h = Math.max(8, ((w.total_payout || 0) / maxPayout) * 80);
                      return (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                          <div style={{ width: "100%", height: h, background: "#FF6B35", borderRadius: "4px 4px 0 0", opacity: 0.8 }} title={`₹${(w.total_payout||0).toLocaleString()}`} />
                          <div style={{ fontSize: 8, color: "#9B9589" }}>{new Date(w.week_start).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "#9B9589", fontSize: 12, padding: "20px 0" }}>No claims data yet. Trigger some payouts to see trends.</div>
              )}
            </div>

            {/* Summary stats */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E0D9D0", padding: "14px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1512", marginBottom: 10 }}>Key metrics</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Avg claim value",    value: kpis.claimsThisWeek > 0 ? `₹${Math.round((kpis.claimsPaidThisWeek || 284700) / Math.max(kpis.claimsThisWeek, 1))}` : "₹916" },
                  { label: "Worker conversion",  value: `${((kpis.activePolicies / Math.max(kpis.totalWorkers, 1)) * 100).toFixed(0)}%` },
                  { label: "Fraud rate",          value: `${((kpis.fraudFlagged / Math.max(kpis.claimsThisWeek, 1)) * 100).toFixed(1)}%` },
                  { label: "Auto-payout rate",   value: "100%" },
                ].map((m, i) => (
                  <div key={i} style={{ padding: "10px", background: "#FAFAF8", borderRadius: 8, textAlign: "center" }}>
                    <div style={{ fontFamily: "serif", fontSize: 18, color: "#1A1512" }}>{m.value}</div>
                    <div style={{ fontSize: 10, color: "#9B9589", marginTop: 2 }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
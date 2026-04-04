"use client";
import { useState, useEffect, useCallback } from "react";
import { INSURER_STATS, ZONE_RISK_MAP } from "@/data/mockData";
import FraudScoreVisualiser from "./FraudScoreVisualiser";
import { Badge } from "@/components/ui";

const SYSTEM_STATUS = [
  { name: "OpenWeather API", status: "Healthy", latency: "124ms" },
  { name: "Groq AI Service", status: "Healthy", latency: "310ms" },
  { name: "PostgreSQL DB", status: "Healthy", latency: "85ms" },
  { name: "Twilio WhatsApp", status: "Warning", latency: "1.2s" },
];

const FORECAST = [
  { city: "Chennai", prob: 84, trigger: "Heavy Rain", workers: 1420 },
  { city: "Hyderabad", prob: 71, trigger: "Heat Stress", workers: 870 },
  { city: "Delhi", prob: 58, trigger: "AQI Warning", workers: 1340 },
  { city: "Mumbai", prob: 43, trigger: "Platform Outage", workers: 2100 },
];

const PIN_RISK_LOOKUP = {
  "600028": 81,
  "600001": 72,
  "110092": 77,
  "110001": 65,
  "400053": 74,
  "400050": 28,
  "500001": 69,
  "560034": 55,
  "560001": 38,
  "302001": 52,
  "380001": 63,
};

export default function InsurerDashboard({ onBack }) {
  const [insurerTab, setInsurerTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [claims, setClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");

  const insurerTabs = [
    { id: "overview", label: "Overview" },
    { id: "claims", label: "Claims" },
    { id: "fraud", label: "Fraud AI" },
    { id: "zones", label: "Zone Risk" },
    { id: "forecast", label: "Forecast" },
  ];

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/insurer/stats", { cache: "no-store" });
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchClaims = useCallback(async () => {
    setClaimsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/claims?scope=insurer&limit=20", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch claims");
      const data = await res.json();
      setClaims(data.claims || []);
    } catch (err) {
      console.error(err);
      setError("Could not load real-time claims.");
      setClaims([]);
    } finally {
      setClaimsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  useEffect(() => {
    if (insurerTab === "claims") {
      fetchClaims();
    }
  }, [insurerTab, fetchClaims]);

  async function updateClaimStatus(claimId, status) {
    try {
      const res = await fetch("/api/claims", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim_id: claimId, status }),
      });
      if (!res.ok) {
        throw new Error("Failed to update claim status");
      }

      setClaims((prev) => prev.map((claim) => (
        claim.claim_id === claimId ? { ...claim, status } : claim
      )));
    } catch (err) {
      console.error(err);
      setError("Failed to update claim status.");
    }
  }

  const kpis = stats?.kpis || {
    totalWorkers: INSURER_STATS.totalWorkers,
    activePolicies: INSURER_STATS.activePolicies,
    premiumThisWeek: INSURER_STATS.premiumThisWeek,
    claimsPaidThisWeek: INSURER_STATS.claimsPaid,
    lossRatio: INSURER_STATS.lossRatio,
    claimsThisWeek: INSURER_STATS.claimsThisWeek,
  };

  const zoneRiskData = stats?.zoneRisk?.length
    ? stats.zoneRisk.map((zone) => ({
        city: zone.city,
        pin: zone.pin_code,
        nfi: PIN_RISK_LOOKUP[zone.pin_code] || 55,
        workers: zone.workers || 0,
        activeClaims: zone.total_claims || 0,
        paidClaims: zone.paid_claims || 0,
        activePolicies: zone.active_policies || 0,
        totalPayout: zone.total_payout || 0,
      }))
    : ZONE_RISK_MAP;

  return (
    <div style={{ minHeight: "100vh", background: "#F5F0EB", padding: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ background: "#1A1512", borderRadius: 16, padding: "14px 20px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "#FF6B35", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🛡</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>GigShield Admin</div>
              <div style={{ color: "#9B8E84", fontSize: 10 }}>
                Insurer dashboard · {statsLoading ? "Loading..." : stats?._fallback ? "Fallback" : "Live view"}
              </div>
            </div>
          </div>
          <button onClick={onBack} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#fff", fontSize: 12, cursor: "pointer" }}>← Worker view</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
          {[
            { label: "Active policies", value: kpis.activePolicies.toLocaleString(), sub: "Total", color: "#4CAF82" },
            { label: "Premium Week", value: `₹${(kpis.premiumThisWeek / 1000).toFixed(0)}K`, sub: "collected", color: "#FF6B35" },
            { label: "Claims Paid", value: `₹${(kpis.claimsPaidThisWeek / 1000).toFixed(0)}K`, sub: "approved", color: "#F59E0B" },
            { label: "Loss Ratio", value: `${kpis.lossRatio}%`, sub: "healthy", color: kpis.lossRatio < 70 ? "#4CAF82" : "#EF4444" },
          ].map((item, index) => (
            <div key={index} style={{ padding: "12px 10px", background: "#fff", border: "1px solid #E0D9D0", borderRadius: 12, textAlign: "center" }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#1A1512", marginTop: 2 }}>{item.label}</div>
              <div style={{ fontSize: 9, color: "#9B9589" }}>{item.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto" }}>
          {insurerTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setInsurerTab(tab.id)}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                background: insurerTab === tab.id ? "#1A1512" : "#fff",
                color: insurerTab === tab.id ? "#fff" : "#6B6258",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                border: `1px solid ${insurerTab === tab.id ? "#1A1512" : "#E0D9D0"}`,
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {insurerTab === "overview" && (
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E0D9D0", padding: "14px 16px", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1512", marginBottom: 12 }}>Platform Integrity Monitor</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {SYSTEM_STATUS.map((item, index) => (
                <div key={index} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#FAFAF8", borderRadius: 10, border: "1px solid #E0D9D0" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1A1512" }}>{item.name}</div>
                    <div style={{ fontSize: 9, color: "#9B9589" }}>{item.latency}</div>
                  </div>
                  <Badge text={item.status} color={item.status === "Healthy" ? "#4CAF82" : "#F59E0B"} bg={item.status === "Healthy" ? "#E8F5EE" : "#FEF3C7"} />
                </div>
              ))}
            </div>
          </div>
        )}

        {insurerTab === "claims" && (
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E0D9D0", overflow: "hidden", minHeight: 100 }}>
            {claimsLoading && <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "#6B6258" }}>Loading live claims...</div>}
            {error && <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "#EF4444" }}>{error}</div>}
            {!claimsLoading && !error && claims.length === 0 && <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "#6B6258" }}>No active claims detected.</div>}

            {claims.map((claim) => (
              <div key={claim.claim_id} style={{ padding: "12px 14px", borderBottom: "1px solid #F5F0EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1A1512" }}>{claim.claim_id.substring(0, 8).toUpperCase()}</span>
                    <span style={{ fontSize: 10, color: "#6B6258" }}>{claim.worker_name || "Rider"} · {claim.trigger_type}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1512" }}>₹{claim.amount}</div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  {claim.status === "paid" ? (
                    <Badge text="PAID" color="#4CAF82" bg="#E8F5EE" />
                  ) : claim.status === "rejected" ? (
                    <Badge text="REJECTED" color="#EF4444" bg="#FEE2E2" />
                  ) : (
                    <>
                      <button onClick={() => updateClaimStatus(claim.claim_id, "rejected")} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #EF4444", background: "transparent", color: "#EF4444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Reject</button>
                      <button onClick={() => updateClaimStatus(claim.claim_id, "paid")} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#4CAF82", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Approve</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {insurerTab === "fraud" && <FraudScoreVisualiser />}

        {insurerTab === "zones" && (
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E0D9D0", overflow: "hidden", marginBottom: 14 }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #E0D9D0", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>Zone risk breakdown</span>
              <Badge text="Pin-code NFI" color="#FF6B35" bg="#FFF0EB" />
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#FAFAF8" }}>
                    {["City", "Pin", "NFI", "Workers", "Claims", "Risk"].map((heading) => (
                      <th key={heading} style={{ padding: "7px 10px", fontSize: 10, fontWeight: 600, color: "#9B9589", textAlign: "left", borderBottom: "1px solid #E0D9D0" }}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...zoneRiskData].sort((a, b) => b.nfi - a.nfi).map((zone, index) => {
                    const riskColor = zone.nfi > 65 ? "#EF4444" : zone.nfi > 40 ? "#F59E0B" : "#4CAF82";
                    const riskLabel = zone.nfi > 65 ? "High" : zone.nfi > 40 ? "Mid" : "Low";
                    return (
                      <tr key={index} style={{ borderBottom: "1px solid #F5F0EB" }}>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: "#1A1512", fontWeight: 600 }}>{zone.city}</td>
                        <td style={{ padding: "8px 10px", fontSize: 11, color: "#6B6258", fontFamily: "monospace" }}>{zone.pin}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#EEE8E0" }}>
                              <div style={{ width: `${zone.nfi}%`, height: "100%", background: riskColor, borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: riskColor }}>{zone.nfi}</span>
                          </div>
                        </td>
                        <td style={{ padding: "8px 10px", fontSize: 11, color: "#6B6258" }}>
                          <div>{(zone.workers || 0).toLocaleString()}</div>
                          {"activePolicies" in zone && (
                            <div style={{ fontSize: 9, color: "#9B9589", marginTop: 2 }}>{zone.activePolicies || 0} active policies</div>
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", fontSize: 11, color: zone.activeClaims > 20 ? "#EF4444" : "#6B6258", fontWeight: zone.activeClaims > 20 ? 700 : 400 }}>
                          <div>{zone.activeClaims || 0}</div>
                          {"paidClaims" in zone && (
                            <div style={{ fontSize: 9, color: "#9B9589", marginTop: 2 }}>
                              {zone.paidClaims || 0} paid · ₹{(zone.totalPayout || 0).toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "8px 10px" }}><Badge text={riskLabel} color={riskColor} bg={zone.nfi > 65 ? "#FEE2E2" : zone.nfi > 40 ? "#FEF3C7" : "#E8F5EE"} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {insurerTab === "forecast" && (
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E0D9D0", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>Payout Risk vs Premium</div>
                <div style={{ fontSize: 10, color: "#9B9589" }}>Predictive 7-day trend</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF6B35" }} />
                  <span style={{ fontSize: 9 }}>Premium</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4CAF82" }} />
                  <span style={{ fontSize: 9 }}>Risk</span>
                </div>
              </div>
            </div>

            <div style={{ width: "100%", height: 160 }}>
              <svg viewBox="0 0 400 150" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                {[0, 25, 50, 75, 100].map((y) => (
                  <line key={y} x1="0" y1={100 - y} x2="400" y2={100 - y} stroke="#F5F0EB" strokeWidth="1" />
                ))}
                <path d="M0,100 L40,85 L80,90 L120,70 L160,75 L200,60 L240,65 L280,50 L320,55 L360,40 L400,45" fill="none" stroke="#FF6B35" strokeWidth="2" />
                <path d="M0,120 L40,110 L80,95 L120,80 L160,60 L200,85 L240,70 L280,90 L320,65 L360,50 L400,40" fill="none" stroke="#4CAF82" strokeWidth="2" strokeDasharray="4,2" />
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
                  <text key={day} x={index * 60} y="130" fontSize="8" fill="#9B9589" textAnchor="middle">{day}</text>
                ))}
              </svg>
            </div>

            <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {FORECAST.map((item, index) => (
                <div key={index} style={{ padding: "9px 11px", background: "#FAFAF8", borderRadius: 10, border: "1px solid #E0D9D0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1A1512" }}>{item.city}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: item.prob > 70 ? "#EF4444" : "#F59E0B" }}>{item.prob}%</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#6B6258", marginBottom: 5 }}>{item.trigger}</div>
                  <div style={{ height: 3, background: "#EEE8E0", borderRadius: 2 }}>
                    <div style={{ width: `${item.prob}%`, height: "100%", background: item.prob > 70 ? "#EF4444" : "#F59E0B", borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 9, color: "#9B9589", marginTop: 3 }}>{item.workers.toLocaleString()} workers at risk</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

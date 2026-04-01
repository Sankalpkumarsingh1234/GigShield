"use client";
import { useState, useEffect } from "react";
import { CLAIMS_HISTORY } from "@/data/mockData";
import { Badge } from "@/components/ui";

const TRIGGER_META = {
  "Heavy Rainfall":    { icon: "🌧", color: "#3B82F6", bg: "#EFF6FF" },
  "Heat Stress":       { icon: "🌡", color: "#EF4444", bg: "#FEF2F2" },
  "AQI Warning":       { icon: "💨", color: "#8B5CF6", bg: "#F5F3FF" },
  "Platform Downtime": { icon: "📵", color: "#F59E0B", bg: "#FFFBEB" },
  "Waterlogging":      { icon: "🌊", color: "#0EA5E9", bg: "#F0F9FF" },
  "Zone Curfew":       { icon: "🚧", color: "#F97316", bg: "#FFF7ED" },
};

export default function ClaimsHistory({ workerId }) {
  const [claims,  setClaims]  = useState(null);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = workerId || "WRK-DEFAULT";
    fetch(`/api/claims?worker_id=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.claims) && data.claims.length > 0) {
          setClaims(data.claims);
          setStats({
            total: data.total || 0,
            count: data.count || 0,
            avgPayout: data.meta?.avgPayout || 0,
            byTrigger: data.byTrigger || {},
          });
        } else {
          // Fallback to mock
          setClaims(CLAIMS_HISTORY);
          const total = CLAIMS_HISTORY.reduce((s, c) => s + c.amount, 0);
          setStats({ total, count: CLAIMS_HISTORY.length, avgPayout: Math.round(total / CLAIMS_HISTORY.length), byTrigger: {} });
        }
      })
      .catch(() => {
        setClaims(CLAIMS_HISTORY);
        const total = CLAIMS_HISTORY.reduce((s, c) => s + c.amount, 0);
        setStats({ total, count: CLAIMS_HISTORY.length, avgPayout: Math.round(total / CLAIMS_HISTORY.length), byTrigger: {} });
      })
      .finally(() => setLoading(false));
  }, [workerId]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160, color: "#9B9589", fontSize: 13 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF6B35", animation: "pulse 1s infinite", margin: "0 auto 8px" }} />
          Loading claims...
        </div>
      </div>
    );
  }

  if (!claims || claims.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🛡</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1512", marginBottom: 4 }}>No claims yet</div>
        <div style={{ fontSize: 12, color: "#9B9589" }}>Your auto-payouts will appear here when disruptions trigger your coverage.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[
          { label: "Total received",  value: `₹${stats?.total?.toLocaleString() || 0}`, color: "#4CAF82" },
          { label: "Payouts",         value: stats?.count || 0,                          color: "#FF6B35" },
          { label: "Avg payout",      value: `₹${stats?.avgPayout || 0}`,               color: "#F59E0B" },
        ].map((s, i) => (
          <div key={i} style={{ padding: "8px", background: "#FAFAF8", border: "1px solid #E0D9D0", borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontFamily: "serif", fontSize: 16, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9, color: "#9B9589", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Claims list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {claims.map((c, i) => {
          const trigger = c.trigger_type || c.trigger || "Heavy Rainfall";
          const meta = TRIGGER_META[trigger] || { icon: "⚡", color: "#6B6258", bg: "#FAFAF8" };
          return (
            <div key={c.claim_id || c.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 13px", background: meta.bg, border: `1px solid ${meta.color}22`, borderRadius: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, border: `1px solid ${meta.color}33` }}>
                  {meta.icon}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1A1512" }}>{trigger}</div>
                  <div style={{ fontSize: 10, color: "#6B6258" }}>
                    {c.date} · {c.city}
                    {c.trigger_value ? (
                      <span style={{ color: meta.color, marginLeft: 4, fontWeight: 600 }}>
                        {c.trigger_value}
                        {trigger === "AQI Warning" ? " AQI" : trigger === "Platform Downtime" ? " min" : trigger === "Heat Stress" ? "°C" : "mm"}
                      </span>
                    ) : null}
                  </div>
                  {c.upi_ref && (
                    <div style={{ fontSize: 9, color: "#9B9589", marginTop: 1 }}>Ref: {c.upi_ref}</div>
                  )}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "serif", fontSize: 18, color: "#2D6B4A", fontWeight: 700 }}>₹{c.amount}</div>
                <Badge text={c.status || "Paid"} color="#2D6B4A" bg="#E8F5EE" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Auto-payout info footer */}
      <div style={{ marginTop: 12, padding: "10px 12px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10 }}>
        <div style={{ fontSize: 11, color: "#166534", fontWeight: 600 }}>✅ All payouts are 100% automatic</div>
        <div style={{ fontSize: 10, color: "#4A7C5E", marginTop: 2 }}>Triggers checked every 15 min · UPI credit within 2 min of threshold breach · No claims filing ever needed</div>
      </div>
    </div>
  );
}
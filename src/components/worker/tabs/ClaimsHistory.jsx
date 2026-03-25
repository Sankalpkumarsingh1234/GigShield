"use client";
import { useState, useEffect } from "react";
import { CLAIMS_HISTORY } from "@/data/mockData";
import { Badge } from "@/components/ui";

export default function ClaimsHistory({ workerId }) {
  const [claims, setClaims] = useState(null);
  const [total,  setTotal]  = useState(0);

  useEffect(() => {
    const id = workerId || "WRK-DEFAULT";
    fetch(`/api/claims?worker_id=${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(data => {
        if (data.claims && data.claims.length > 0) {
          setClaims(data.claims);
          setTotal(data.total || 0);
        } else {
          setClaims(CLAIMS_HISTORY);
          setTotal(CLAIMS_HISTORY.reduce((s, c) => s + c.amount, 0));
        }
      })
      .catch(() => {
        setClaims(CLAIMS_HISTORY);
        setTotal(CLAIMS_HISTORY.reduce((s, c) => s + c.amount, 0));
      });
  }, [workerId]);

  const TRIGGER_ICON = {
    "Heavy Rainfall":    "🌧",
    "Heat Stress":       "🌡",
    "AQI Warning":       "💨",
    "Platform Downtime": "📵",
    "Waterlogging":      "🌊",
    "AQI":               "💨",
  };

  if (!claims) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160, color: "#9B9589", fontSize: 13 }}>
        Loading claims...
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>Claims history</span>
          <div style={{ fontSize: 10, color: "#9B9589", marginTop: 1 }}>Auto-paid · No manual claims needed</div>
        </div>
        <span style={{ fontFamily: "serif", fontSize: 16, color: "#4CAF82" }}>₹{total.toLocaleString()} total</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {claims.map((c, i) => (
          <div key={c.claim_id || c.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#FAFAF8", border: "1px solid #E0D9D0", borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{TRIGGER_ICON[c.trigger_type || c.trigger] || "⚡"}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1A1512" }}>{c.trigger_type || c.trigger}</div>
                <div style={{ fontSize: 11, color: "#9B9589" }}>
                  {c.date} · {c.city}
                  {c.trigger_value ? <span style={{ color: "#FF6B35" }}> · {c.trigger_value}{c.trigger_type === "AQI Warning" ? " AQI" : c.trigger_type === "Platform Downtime" ? " min" : c.trigger_type === "Heat Stress" ? "°C" : "mm"}</span> : null}
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "serif", fontSize: 16, color: "#4CAF82" }}>₹{c.amount}</div>
              <Badge text={c.status === "paid" ? "Paid" : c.status || "Paid"} color="#2D6B4A" bg="#E8F5EE" />
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, padding: "10px 12px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10 }}>
        <div style={{ fontSize: 11, color: "#166534", fontWeight: 600 }}>✅ All payouts are automatic</div>
        <div style={{ fontSize: 10, color: "#4A7C5E", marginTop: 2 }}>Triggers checked every 15 min · UPI credit within 2 min of threshold breach</div>
      </div>
    </div>
  );
}

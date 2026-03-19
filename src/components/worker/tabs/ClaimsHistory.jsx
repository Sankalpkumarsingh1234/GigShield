"use client";
import { CLAIMS_HISTORY } from "@/data/mockData";
import { Badge } from "@/components/ui";

export default function ClaimsHistory() {
  const total = CLAIMS_HISTORY.reduce((s, c) => s + c.amount, 0);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>Claims history</span>
        <span style={{ fontFamily: "serif", fontSize: 16, color: "#4CAF82" }}>₹{total.toLocaleString()} total</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {CLAIMS_HISTORY.map(c => (
          <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#FAFAF8", border: "1px solid #E0D9D0", borderRadius: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1A1512" }}>{c.trigger}</div>
              <div style={{ fontSize: 11, color: "#9B9589" }}>{c.date} · {c.city}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "serif", fontSize: 16, color: "#4CAF82" }}>₹{c.amount}</div>
              <Badge text="Paid" color="#2D6B4A" bg="#E8F5EE" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

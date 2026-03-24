"use client";
import { useEffect, useMemo, useState } from "react";
import { CLAIMS_HISTORY } from "@/data/mockData";
import { Badge } from "@/components/ui";


  export default function ClaimsHistory({ userId }) {
  const [claims, setClaims] = useState(CLAIMS_HISTORY);
  const [isMock, setIsMock] = useState(false);

  useEffect(() => {
    if (!userId) return;

    let active = true;

    async function loadClaims() {
      try {
        const res = await fetch(`/api/users/${userId}`);
        const data = await res.json();
        if (!active || !res.ok) return;

        if (Array.isArray(data.claims)) {
          const mapped = data.claims.map((claim) => ({
            id: claim.id,
            trigger: claim.trigger,
            date: new Date(claim.created_at).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
            city: "Auto-trigger",
            amount: claim.amount,
            status: claim.status || "paid",
          }));

          setClaims(mapped.length ? mapped : []);
        }

        setIsMock(Boolean(data.mock));
      } catch (error) {
        console.error("Failed to load claims:", error);
      }
    }

    loadClaims();

    return () => {
      active = false;
    };
  }, [userId]);

  const effectiveClaims = useMemo(
    () => (claims.length ? claims : CLAIMS_HISTORY),
    [claims]
  );

  const total = effectiveClaims.reduce((sum, claim) => sum + claim.amount, 0);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>
          Claims history {isMock ? "(demo)" : ""}
        </span>
        <span style={{ fontFamily: "serif", fontSize: 16, color: "#4CAF82" }}>₹{total.toLocaleString()} total</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {effectiveClaims.map((c) => (
          <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#FAFAF8", border: "1px solid #E0D9D0", borderRadius: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1A1512" }}>{c.trigger}</div>
              <div style={{ fontSize: 11, color: "#9B9589" }}>{c.date} · {c.city}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "serif", fontSize: 16, color: "#4CAF82" }}>₹{c.amount}</div>
              <Badge text={c.status === "paid" ? "Paid" : c.status} color="#2D6B4A" bg="#E8F5EE" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { TIERS } from "@/data/mockData";
import { calcPremium } from "@/utils/premium";
import { Badge, ctaBtn } from "@/components/ui";
import PhonePePayButton from "@/components/payment/PhonePePayButton";

export default function PolicyScreen({ data, onNext }) {
  const [selected, setSelected] = useState("standard");
  const [paying,   setPaying]   = useState(false);
  const { nfi, seasonal } = data;
  const tier    = TIERS.find(t => t.id === selected);
  const premium = calcPremium(tier.base, nfi, seasonal, true);

  function handlePaymentSuccess({ transactionId, mock }) {
    // Pass payment info downstream and move to dashboard
    onNext({ ...data, tier: selected, premium, paymentTxnId: transactionId, paymentMock: mock });
  }

  function handlePaymentError(err) {
    console.error('Payment failed:', err);
    setPaying(false);
  }

  return (
    <div>
      <div style={{ marginBottom: 6 }}><Badge text="Step 3 of 4" /></div>
      <h2 style={{ fontFamily: "serif", fontSize: 26, margin: "8px 0 4px", color: "#1A1512" }}>Choose your shield</h2>
      <p style={{ fontSize: 14, color: "#6B6258", marginBottom: 20 }}>Weekly pricing — debited every Monday.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {TIERS.map(t => {
          const p      = calcPremium(t.base, nfi, seasonal, true);
          const active = selected === t.id;
          return (
            <div key={t.id} onClick={() => !paying && setSelected(t.id)} style={{ padding: "14px 16px", borderRadius: 14, cursor: paying ? "default" : "pointer", border: `2px solid ${active ? t.color : "#E0D9D0"}`, background: active ? t.bg : "#FAFAF8", transition: "all 0.2s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 15, color: active ? t.color : "#1A1512" }}>{t.name}</span>
                  <div style={{ fontSize: 11, color: "#9B9589", marginTop: 2 }}>{t.coverage.join(" · ")}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "serif", fontSize: 22, color: active ? t.color : "#1A1512" }}>₹{p}</div>
                  <div style={{ fontSize: 11, color: "#9B9589" }}>per week</div>
                </div>
              </div>
              {active && (
                <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(255,255,255,0.7)", borderRadius: 8 }}>
                  {[
                    ["Base premium",    `₹${t.base}`,                           "#1A1512"],
                    ["NFI surcharge",   `+₹${Math.round((nfi / 100) * 12)}`,   "#EF4444"],
                    ["No-claim loyalty",`-₹${Math.round(t.base * 0.12)}`,       "#4CAF82"],
                  ].map(([label, val, col], i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: i > 0 ? 4 : 0 }}>
                      <span style={{ color: "#6B6258" }}>{label}</span>
                      <span style={{ color: col, fontWeight: 600 }}>{val}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4, paddingTop: 6, borderTop: "1px solid #E0D9D0" }}>
                    <span style={{ color: "#1A1512", fontWeight: 700 }}>Max weekly payout</span>
                    <span style={{ color: t.color, fontWeight: 700 }}>₹{t.max.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* PhonePe payment button — replaces the old mock CTA */}
      <PhonePePayButton
        amount={premium}
        label={`Activate via PhonePe · ₹${premium}/wk`}
        tierId={selected}
        userId={data?.workerId || "WRK-DEFAULT"}
        phone={data?.phone || ""}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
        style={{ marginTop: 4 }}
      />

      <p style={{ textAlign: "center", fontSize: 11, color: "#9B9589", marginTop: 10 }}>
        🔒 Secured by PhonePe · UPI · Netbanking · Cards
      </p>
    </div>
  );
}
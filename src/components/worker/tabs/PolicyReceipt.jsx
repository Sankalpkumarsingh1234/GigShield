"use client";
import { useState } from "react";
import { TIERS } from "@/data/mockData";
import { calcPremium } from "@/utils/premium";
import PhonePePayButton from "@/components/payment/PhonePePayButton";

export default function PolicyReceipt({ data, onPolicyCreated }) {
  const {
    name,
    platform,
    tier,
    nfi,
    pinData,
    seasonal,
    workerId,
    phone,
    hasPolicy,
  } = data;
  const [downloaded, setDownloaded] = useState(false);
  const [selectedTier, setSelectedTier] = useState(tier);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("");

  const tierObj = TIERS.find((option) => option.id === selectedTier) || TIERS[1];
  const computedPremium = calcPremium(tierObj.base, nfi, seasonal, true);
  const weekStart = new Date();
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);

  function fmt(date) {
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  async function persistPolicy() {
    setSavingPolicy(true);
    setPaymentStatus("");

    try {
      const response = await fetch("/api/policies", {
        method: hasPolicy ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(
          hasPolicy
            ? { tier: selectedTier, premium: computedPremium }
            : { user_id: workerId, tier: selectedTier, premium: computedPremium }
        ),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || "Could not save your policy.");
      }

      onPolicyCreated?.(result.policy);
      setPaymentStatus("Payment confirmed and policy updated.");
    } catch (error) {
      setPaymentStatus(error.message || "Payment succeeded, but the policy did not update.");
    } finally {
      setSavingPolicy(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>Policy receipt</span>
        <button
          onClick={() => {
            setDownloaded(true);
            setTimeout(() => setDownloaded(false), 2000);
          }}
          style={{
            padding: "5px 12px",
            borderRadius: 8,
            border: "1px solid #E0D9D0",
            background: downloaded ? "#E8F5EE" : "#FAFAF8",
            fontSize: 12,
            fontWeight: 600,
            color: downloaded ? "#2D6B4A" : "#6B6258",
            cursor: "pointer",
          }}
        >
          {downloaded ? "Saved" : "Download PDF"}
        </button>
      </div>

      <div style={{ border: "1.5px solid #E0D9D0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ background: "#1A1512", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>GigShield Policy</div>
            <div style={{ color: "#9B8E84", fontSize: 10 }}>#{`GS${Date.now().toString().slice(-8)}`}</div>
          </div>
          <div style={{ background: "#FF6B35", borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: "#fff" }}>
            {hasPolicy ? "ACTIVE" : "READY"}
          </div>
        </div>

        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 7 }}>
          {[
            ["Policyholder", name],
            ["Platform", platform],
            ["Zone", `${pinData.zone}, ${pinData.city}`],
            ["NFI Risk Score", `${nfi}/100`],
            ["Plan", `${tierObj.name} Plan`],
            ["Weekly Premium", `Rs ${computedPremium}`],
            ["Max Weekly Payout", `Rs ${tierObj.max.toLocaleString()}`],
            ["Coverage Period", `${fmt(weekStart)} - ${fmt(weekEnd)}`],
            ["Coverage", tierObj.coverage.join(", ")],
          ].map(([label, value], index) => (
            <div
              key={index}
              style={{ display: "flex", justifyContent: "space-between", fontSize: 12, paddingBottom: 7, borderBottom: "1px solid #F5F0EB" }}
            >
              <span style={{ color: "#6B6258" }}>{label}</span>
              <span style={{ fontWeight: 600, color: "#1A1512", textAlign: "right", maxWidth: "55%" }}>{value}</span>
            </div>
          ))}
        </div>

        <div style={{ background: "#F5F0EB", padding: "8px 14px", fontSize: 10, color: "#9B9589" }}>
          Parametric insurance - payouts trigger automatically. No claims filing required.
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>
          {hasPolicy ? "Switch or renew your plan" : "Activate your coverage"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {TIERS.map((option) => {
            const optionPremium = calcPremium(option.base, nfi, seasonal, true);
            const active = selectedTier === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedTier(option.id)}
                style={{
                  textAlign: "left",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: `1.5px solid ${active ? option.color : "#E0D9D0"}`,
                  background: active ? option.bg : "#FAFAF8",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: active ? option.color : "#1A1512" }}>
                      {option.name}
                    </div>
                    <div style={{ fontSize: 10, color: "#6B6258", marginTop: 2 }}>
                      {option.coverage.join(", ")}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "serif", fontSize: 20, color: active ? option.color : "#1A1512" }}>
                      Rs {optionPremium}
                    </div>
                    <div style={{ fontSize: 10, color: "#9B9589" }}>/ week</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <PhonePePayButton
          amount={computedPremium}
          label={`${hasPolicy ? "Pay to switch plan" : "Activate via Razorpay"} - Rs ${computedPremium}/wk`}
          tierId={selectedTier}
          userId={workerId}
          phone={phone || ""}
          style={{ marginTop: 2 }}
          onSuccess={persistPolicy}
          onError={(error) => setPaymentStatus(error.message || "Payment failed. Please retry.")}
        />

        {savingPolicy && (
          <div style={{ padding: "10px 12px", borderRadius: 10, background: "#FFF8F0", color: "#92400E", fontSize: 12 }}>
            Saving your updated policy...
          </div>
        )}

        {paymentStatus && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: paymentStatus.includes("confirmed") ? "#E8F5EE" : "#FEE2E2",
              color: paymentStatus.includes("confirmed") ? "#2D6B4A" : "#991B1B",
              fontSize: 12,
            }}
          >
            {paymentStatus}
          </div>
        )}

        <div style={{ fontSize: 11, color: "#9B9589" }}>
          In demo mode, this updates the dashboard immediately. With Razorpay test keys, Checkout opens in test mode and verifies the payment before updating your policy.
        </div>
      </div>
    </div>
  );
}

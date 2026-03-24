"use client";
import { useState, useRef } from "react";
import { getSeasonalFactor } from "@/utils/premium";
import { GLOBAL_STYLES, StepDots } from "@/components/ui";
import OnboardingScreen from "@/components/worker/OnboardingScreen";
import RiskScreen from "@/components/worker/RiskScreen";
import PolicyScreen from "@/components/worker/PolicyScreen";
import DashboardScreen from "@/components/worker/DashboardScreen";
import InsurerDashboard from "@/components/insurer/InsurerDashboard";
import { TIERS } from "@/data/mockData";

export default function GigShieldApp() {
  const [step, setStep] = useState(0);
  const [userData, setUserData] = useState({});
  const [showInsurer, setShowInsurer] = useState(false);
  const contentRef = useRef(null);


  function goNext(data) {
     async function goNext(data) {
    const enriched =
      step === 0
        ? { ...data, nfi: data.pinData.nfi, seasonal: getSeasonalFactor() }
        : data;

    let nextData = enriched;

    if (step === 2) {
      const tierObj = TIERS.find((t) => t.id === enriched.tier);

      try {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: enriched.name,
            platform: enriched.platform,
            pinCode: enriched.pin,
            earnings: Number(enriched.earnings),
            nfi: Number(enriched.nfi),
            policy: {
              tier: enriched.tier,
              premium: enriched.premium,
              maxPayout: tierObj?.max || 1000,
            },
          }),
        });

        const payload = await res.json();

        if (res.ok && payload?.user?.id) {
          nextData = {
            ...enriched,
            userId: payload.user.id,
            dbProfile: payload,
          };
        }
      } catch (error) {
        console.error("Unable to persist user profile:", error);
      }
    }

    setUserData((prev) => ({ ...prev, ...nextData }));
    setStep((s) => s + 1);
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (showInsurer) return <InsurerDashboard onBack={() => setShowInsurer(false)} />;

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <div style={{ minHeight: "100vh", background: "#F5F0EB", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 440, background: "#fff", borderRadius: 24, boxShadow: "0 4px 40px rgba(0,0,0,0.08)", overflow: "hidden" }}>

          {/* Top bar */}
          <div style={{ padding: "14px 20px", background: "#1A1512", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FF6B35", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛵</div>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>GigShield</div>
                <div style={{ color: "#9B8E84", fontSize: 11 }}>Income protection for delivery partners</div>
              </div>
            </div>
            <button onClick={() => setShowInsurer(true)} style={{ padding: "4px 10px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em" }}>
              INSURER VIEW
            </button>
          </div>

          {/* Content */}
          <div ref={contentRef} style={{ padding: "22px", maxHeight: "82vh", overflowY: "auto" }}>
            {step < 4 && <StepDots current={step} total={4} />}
            {step === 1 && <RiskScreen data={userData} onNext={goNext} />}
            {step === 2 && <PolicyScreen data={userData} onNext={goNext} />}
            {step === 3 && <DashboardScreen data={userData} />}
          </div>

        </div>
      </div>
    </>
  );
}

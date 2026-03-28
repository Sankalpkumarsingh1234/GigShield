// src/app/page.jsx
// REPLACE your existing page.jsx with this one
// Adds: auth awareness, pre-fills onboarding from Supabase profile, sign-out

"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSeasonalFactor } from "@/utils/premium";
import { StepDots } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "@/lib/supabase";
import { PIN_RISK } from "@/data/pinRisk";
import OnboardingScreen  from "@/components/worker/OnboardingScreen";
import RiskScreen        from "@/components/worker/RiskScreen";
import PolicyScreen      from "@/components/worker/PolicyScreen";
import DashboardScreen   from "@/components/worker/DashboardScreen";
import InsurerDashboard  from "@/components/insurer/InsurerDashboard";

export default function GigShieldApp() {
  const router     = useRouter();
  const { user, profile, loading } = useAuth();
  const [step,        setStep]        = useState(0);
  const [userData,    setUserData]    = useState({});
  const [showInsurer, setShowInsurer] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    if (user && profile) {
      const pinData = profile.pin_code
        ? PIN_RISK[profile.pin_code] || { nfi: 55, city: "Your city", zone: "Area", reason: "Average risk" }
        : null;

      setUserData(prev => ({
        ...prev,
        workerId: profile.user_id,
        name: profile.name || "",
        platform: profile.platform || "Zomato",
        pin: profile.pin_code || "",
        pinData,
        earnings: profile.earnings ? String(profile.earnings) : "",
        nfi: profile.nfi || pinData?.nfi || 55,
        tier: prev.tier || "standard",
        premium: prev.premium || 0,
      }));
      setStep(3);
    }
  }, [user, profile]);

  // Show loading spinner while auth state resolves
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F5F0EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #FF6B35", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  function goNext(data) {
    const enriched = step === 0
      ? { ...data, nfi: data.pinData.nfi, seasonal: getSeasonalFactor() }
      : data;
    setUserData(prev => ({ ...prev, ...enriched }));
    setStep(s => s + 1);
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSignOut() {
    await signOut();
    router.push("/auth");
  }

  // Pre-fill onboarding data from Supabase profile if available
  const prefillData = profile
    ? {
        name:     profile.name     || "",
        platform: profile.platform || "Zomato",
        pin:      profile.pin_code || "",
        earnings: profile.earnings ? String(profile.earnings) : "",
        pinData:  profile.pin_code ? (PIN_RISK[profile.pin_code] || { nfi: 55, city: "Your city", zone: "Area", reason: "Average risk" }) : null,
      }
    : null;

  if (showInsurer) return <InsurerDashboard onBack={() => setShowInsurer(false)} />;

  return (
    <div
      style={{
        minHeight: "100vh", background: "#F5F0EB",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%", maxWidth: 440, background: "#fff",
          borderRadius: 24, boxShadow: "0 4px 40px rgba(0,0,0,0.08)", overflow: "hidden",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            padding: "14px 20px", background: "#1A1512",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: "#FF6B35",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16,
              }}
            >
              🛵
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>GigShield</div>
              <div style={{ color: "#9B8E84", fontSize: 11 }}>Income protection for delivery partners</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => setShowInsurer(true)}
              style={{
                padding: "4px 10px", borderRadius: 7,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent", color: "rgba(255,255,255,0.7)",
                fontSize: 10, fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em",
              }}
            >
              INSURER VIEW
            </button>

            {user && (
              <button
                onClick={handleSignOut}
                style={{
                  padding: "4px 10px", borderRadius: 7,
                  border: "1px solid rgba(255,107,53,0.4)",
                  background: "transparent", color: "#FF6B35",
                  fontSize: 10, fontWeight: 600, cursor: "pointer",
                }}
              >
                Sign out
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div ref={contentRef} style={{ padding: "22px", maxHeight: "82vh", overflowY: "auto" }}>
          {step < 4 && <StepDots current={step} total={4} />}
          {step === 0 && <OnboardingScreen onNext={goNext} prefill={prefillData} />}
          {step === 1 && <RiskScreen       data={userData} onNext={goNext} />}
          {step === 2 && <PolicyScreen     data={userData} onNext={goNext} />}
          {step === 3 && <DashboardScreen  data={userData} />}
        </div>
      </div>
    </div>
  );
}
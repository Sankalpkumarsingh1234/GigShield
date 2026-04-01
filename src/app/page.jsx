"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PIN_RISK } from "@/data/pinRisk";
import { getSeasonalFactor } from "@/utils/premium";
import DashboardScreen  from "@/components/worker/DashboardScreen";
import InsurerDashboard from "@/components/insurer/InsurerDashboard";

// Loading screen
function LoadingScreen({ message = "Loading your dashboard..." }) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "#F5F0EB",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: "#FF6B35",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, margin: "0 auto 16px",
          animation: "pulse 2s infinite",
        }}>🛵</div>
        <div style={{ color: "#6B6258", fontSize: 14 }}>{message}</div>
      </div>
    </div>
  );
}

export default function GigShieldApp() {
  const router = useRouter();
  const { user, loading, setUser, signOut } = useAuth();
  const [showInsurer, setShowInsurer] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [activePolicy, setActivePolicy] = useState(null);
  const [policyFetched, setPolicyFetched] = useState(false);

  // Fetch user's active policy from DB
  const fetchPolicy = useCallback(async (userId) => {
    if (!userId || policyFetched) return;
    setPolicyLoading(true);
    try {
      const res = await fetch(`/api/policies?user_id=${userId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      setActivePolicy(data.policy || null);
    } catch (e) {
      console.warn("Policy fetch failed:", e.message);
      setActivePolicy(null);
    } finally {
      setPolicyLoading(false);
      setPolicyFetched(true);
    }
  }, [policyFetched]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    } else if (user?.id) {
      fetchPolicy(user.id);
    }
  }, [loading, user, router, fetchPolicy]);

  // Build dashboard data from user + policy
  const dashboardData = useMemo(() => {
    if (!user) return null;

    const pinData = PIN_RISK[user.pinCode] || {
      city: "Your city",
      zone: "Average risk zone",
      reason: "Coverage estimate based on city average.",
      nfi: user.nfi || 55,
      lat: 13.09,
      lng: 80.21,
    };

    const nfi = user.nfi || pinData.nfi || 55;
    const seasonal = getSeasonalFactor();

    // Use DB policy if available, fallback to defaults
    const tier = activePolicy?.tier || "standard";
    const premium = activePolicy?.premium || 54;
    const maxPayout = activePolicy?.max_payout || 1000;
    const coverage = activePolicy?.coverage || ["Rain", "Flooding", "AQI", "Curfew"];

    return {
      ...user,
      nfi,
      seasonal,
      pinData,
      premium,
      tier,
      maxPayout,
      coverage,
      policyId: activePolicy?.id || null,
      workerId: user.id,
      hasPolicy: !!activePolicy,
      // Insurer view toggle
      isInsurer: user.role === "insurer",
    };
  }, [user, activePolicy]);

  async function handleProfileUpdated(updatedUser) {
    setUser(updatedUser);
    // Re-fetch policy in case pin changed → NFI changed → premium changed
    setPolicyFetched(false);
  }

  async function handlePolicyCreated(policyData) {
    setActivePolicy(policyData);
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/auth");
  }

  // Auth guard
  if (loading || (user && policyLoading)) {
    return <LoadingScreen message={loading ? "Authenticating..." : "Loading your policy..."} />;
  }

  if (!user) {
    return <LoadingScreen message="Redirecting to sign in..." />;
  }

  if (!dashboardData) {
    return <LoadingScreen />;
  }

  // Insurer view
  if (showInsurer || user?.role === "insurer") {
    return (
      <InsurerDashboard
        onBack={() => setShowInsurer(false)}
      />
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F5F0EB",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 440,
        background: "#fff",
        borderRadius: 24,
        boxShadow: "0 4px 40px rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}>
        {/* Top bar */}
        <div style={{
          padding: "14px 20px",
          background: "#1A1512",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "#FF6B35",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}>🛵</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>GigShield</div>
              <div style={{ color: "#9B8E84", fontSize: 11 }}>
                Income protection for delivery partners
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowInsurer(true)}
            style={{
              padding: "4px 10px", borderRadius: 7,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "transparent",
              color: "rgba(255,255,255,0.7)",
              fontSize: 10, fontWeight: 600,
              cursor: "pointer", letterSpacing: "0.04em",
            }}
          >
            INSURER VIEW
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "22px", maxHeight: "82vh", overflowY: "auto" }}>
          <DashboardScreen
            data={dashboardData}
            onProfileUpdated={handleProfileUpdated}
            onPolicyCreated={handlePolicyCreated}
            onSignOut={handleSignOut}
          />
        </div>
      </div>
    </div>
  );
}
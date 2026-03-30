"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PIN_RISK } from "@/data/pinRisk";
import DashboardScreen   from "@/components/worker/DashboardScreen";
import InsurerDashboard  from "@/components/insurer/InsurerDashboard";

export default function GigShieldApp() {
  const router = useRouter();
  const { user, loading, setUser, signOut } = useAuth();
  const [showInsurer, setShowInsurer] = useState(false);
  const dashboardData = useMemo(() => {
    if (!user) {
      return null;
    }

    const pinData = PIN_RISK[user.pinCode] || {
      city: "Your city",
      zone: "Average risk zone",
      reason: "Coverage estimate based on city average.",
      nfi: user.nfi || 55,
    };

    return {
      ...user,
      nfi: user.nfi || pinData.nfi || 55,
      pinData,
      premium: 54,
      tier: "standard",
      workerId: user.id,
    };
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [loading, user, router]);

  async function handleProfileUpdated(updatedUser) {
    setUser(updatedUser);
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/auth");
  }

  if (showInsurer) return <InsurerDashboard onBack={() => setShowInsurer(false)} />;

  if (loading || !dashboardData) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#F5F0EB", color: "#6B6258", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Loading your dashboard...
      </div>
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
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      <div style={{
        width: "100%",
        maxWidth: 440,
        background: "#fff",
        borderRadius: 24,
        boxShadow: "0 4px 40px rgba(0,0,0,0.08)",
        overflow: "hidden"
      }}>

        {/* Top bar */}
        <div style={{
          padding: "14px 20px",
          background: "#1A1512",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "#FF6B35",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16
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
              cursor: "pointer", letterSpacing: "0.04em"
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
            onSignOut={handleSignOut}
          />
        </div>

      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { TIERS, DISRUPTION_FEED } from "@/data/mockData";
import { Badge } from "@/components/ui";
import UPIPaymentFlow   from "./tabs/UPIPaymentFlow";
import LiveWeatherWidget from "./tabs/LiveWeatherWidget";
import AIChatAssistant   from "./tabs/AIChatAssistant";
import HeatStressCard    from "./tabs/HeatStressCard";
import DisruptionMap     from "./tabs/DisruptionMap";
import ClaimsHistory     from "./tabs/ClaimsHistory";
import PolicyReceipt     from "./tabs/PolicyReceipt";
import WhatsAppScreen    from "./tabs/WhatsAppScreen";

const TABS = [
  { id: "dashboard", label: "Dashboard"    },
  { id: "weather",   label: "Live Weather" },
  { id: "ai",        label: "✦ Ask AI"     },
  { id: "heat",      label: "Heat Index"   },
  { id: "map",       label: "Risk Map"     },
  { id: "claims",    label: "Claims"       },
  { id: "policy",    label: "Policy"       },
  { id: "whatsapp",  label: "WhatsApp"     },
];

const SEV_COLOR = { high: "#EF4444", medium: "#F59E0B", low: "#4CAF82" };

export default function DashboardScreen({ data }) {
  const { name, platform, premium, tier, nfi, pinData, earnings } = data;
  const tierObj = TIERS.find(t => t.id === tier);
  const [activeTab,  setActiveTab]  = useState("dashboard");
  const [stormAlert, setStormAlert] = useState(true);
  const [payout,     setPayout]     = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [showUPI,    setShowUPI]    = useState(false);
  const [protected_, setProtected]  = useState(parseInt(earnings || 6000) * 0.22);

  function simulateDisruption() {
    setSimulating(true);
    setTimeout(() => { setSimulating(false); setShowUPI(true); }, 1800);
  }

  function handleUPIComplete() {
    const amount = Math.round(tierObj.max * (0.4 + Math.random() * 0.3));
    setShowUPI(false);
    setPayout({ amount, trigger: "Heavy Rainfall", time: new Date().toLocaleTimeString() });
    setProtected(p => p + amount);
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: "#9B9589" }}>Welcome back,</div>
          <h2 style={{ fontFamily: "serif", fontSize: 20, margin: 0, color: "#1A1512" }}>{name}</h2>
          <div style={{ fontSize: 11, color: "#6B6258", marginTop: 1 }}>{platform} · {pinData.zone}, {pinData.city}</div>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", background: "#E8F5EE", borderRadius: 20 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4CAF82", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "#2D6B4A" }}>Active</span>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: "5px 9px", borderRadius: 7, border: "none", background: activeTab === t.id ? "#1A1512" : "#F5F0EB", color: activeTab === t.id ? "#fff" : "#6B6258", fontSize: 10, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s", flexShrink: 0 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <>
          {stormAlert && (
            <div style={{ padding: "11px 13px", background: "linear-gradient(135deg,#FFF3CD,#FFE4A0)", border: "1.5px solid #F59E0B", borderRadius: 12, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E" }}>⚡ Storm Window Alert</div>
                <div style={{ fontSize: 11, color: "#78350F", marginTop: 1 }}>Heavy rain predicted in 6 hrs. Extend coverage?</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setStormAlert(false)} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid #D97706", background: "#F59E0B", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+₹8</button>
                <button onClick={() => setStormAlert(false)} style={{ padding: "4px 7px", borderRadius: 8, border: "1px solid #E0D9D0", background: "transparent", color: "#9B9589", fontSize: 11, cursor: "pointer" }}>✕</button>
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[
              { label: "Protected",  value: `₹${Math.round(protected_).toLocaleString()}`, sub: "this month",        color: "#4CAF82" },
              { label: "Premium",    value: `₹${premium}`,                                  sub: tierObj.name,         color: "#FF6B35" },
              { label: "NFI score",  value: nfi,                                             sub: nfi > 65 ? "High" : "Moderate", color: nfi > 65 ? "#EF4444" : "#F59E0B" },
            ].map((s, i) => (
              <div key={i} style={{ padding: "10px 8px", background: "#FAFAF8", border: "1px solid #E0D9D0", borderRadius: 12, textAlign: "center" }}>
                <div style={{ fontFamily: "serif", fontSize: 17, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 9, fontWeight: 600, color: "#1A1512", marginTop: 2 }}>{s.label}</div>
                <div style={{ fontSize: 9, color: "#9B9589" }}>{s.sub}</div>
              </div>
            ))}
          </div>
          {showUPI ? (
            <UPIPaymentFlow amount={Math.round(tierObj.max * (0.4 + Math.random() * 0.3))} onComplete={handleUPIComplete} />
          ) : (
            <button onClick={simulateDisruption} disabled={simulating || !!payout} style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: simulating ? "#E0D9D0" : payout ? "#E8F5EE" : "#1A1512", color: simulating ? "#6B6258" : payout ? "#2D6B4A" : "#fff", fontSize: 13, fontWeight: 700, cursor: simulating || payout ? "default" : "pointer", marginBottom: 12, transition: "all 0.3s" }}>
              {simulating ? "⏳ Detecting disruption..." : payout ? "✓ Payout processed" : "🌧 Simulate disruption trigger"}
            </button>
          )}
          {payout && !showUPI && (
            <div style={{ padding: "14px", background: "#E8F5EE", border: "2px solid #4CAF82", borderRadius: 14, marginBottom: 12, animation: "slideIn 0.4s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#2D6B4A" }}>✅ Auto-payout processed</div>
                  <div style={{ fontSize: 11, color: "#4A7C5E", marginTop: 2 }}>Trigger: {payout.trigger} · {payout.time}</div>
                  <div style={{ fontSize: 11, color: "#4A7C5E" }}>UPI transfer complete</div>
                </div>
                <div style={{ fontFamily: "serif", fontSize: 26, color: "#2D6B4A" }}>₹{payout.amount}</div>
              </div>
            </div>
          )}
          <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>Live disruption feed</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#EF4444", animation: "pulse 1.5s infinite" }} />
              <span style={{ fontSize: 10, color: "#9B9589" }}>Live</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {DISRUPTION_FEED.map(item => (
              <div key={item.id} style={{ display: "flex", gap: 10, padding: "9px 11px", background: "#FAFAF8", border: "1px solid #E0D9D0", borderRadius: 10, alignItems: "center" }}>
                <div style={{ fontSize: 18 }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#1A1512" }}>{item.title}</div>
                  <div style={{ fontSize: 10, color: "#6B6258" }}>{item.desc}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <Badge text={item.severity} color={SEV_COLOR[item.severity]} bg={item.severity === "high" ? "#FEE2E2" : "#FEF3C7"} />
                  <div style={{ fontSize: 9, color: "#9B9589", marginTop: 2 }}>{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === "weather"  && <LiveWeatherWidget city={pinData.city} />}
      {activeTab === "ai"       && <AIChatAssistant userData={data} />}
      {activeTab === "heat"     && <HeatStressCard />}
      {activeTab === "map"      && <DisruptionMap />}
      {activeTab === "claims"   && <ClaimsHistory />}
      {activeTab === "policy"   && <PolicyReceipt data={data} />}
      {activeTab === "whatsapp" && <WhatsAppScreen />}
    </div>
  );
}

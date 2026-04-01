"use client";
import { useState, useEffect, useCallback } from "react";
import { TIERS } from "@/data/mockData";
import { PIN_RISK } from "@/data/pinRisk";
import { Badge } from "@/components/ui";
import UPIPaymentFlow    from "./tabs/UPIPaymentFlow";
import LiveWeatherWidget  from "./tabs/LiveWeatherWidget";
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
  { id: "profile",   label: "Profile"      },
];

const SEV_COLOR = { high: "#EF4444", medium: "#F59E0B", low: "#4CAF82" };

export default function DashboardScreen({ data, onProfileUpdated, onPolicyCreated, onSignOut }) {
  const { name, platform, premium, tier, nfi, pinData, earnings, workerId, policyId, coverage } = data;
  const tierObj = TIERS.find(t => t.id === tier) || TIERS[1];

  const [activeTab,  setActiveTab]  = useState("dashboard");
  const [stormAlert, setStormAlert] = useState(true);
  const [payout,     setPayout]     = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [showUPI,    setShowUPI]    = useState(false);
  const [payoutAmount, setPayoutAmount] = useState(0);
  const [disruptionFeed, setDisruptionFeed] = useState(null);
  const [feedLoading, setFeedLoading] = useState(true);
  const [totalProtected, setTotalProtected] = useState(0);
  const [profileForm, setProfileForm] = useState({
    name: data.name || "",
    email: data.email || "",
    phone: data.phone || "",
    platform: data.platform || "Zomato",
    pinCode: data.pinCode || "",
    earnings: data.earnings || "",
  });
  const [profileStatus, setProfileStatus] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // Fetch live disruption feed from DB
  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch(`/api/disruptions?limit=8`, { cache: "no-store" });
      const data = await res.json();
      setDisruptionFeed(data.feed || []);
    } catch {
      setDisruptionFeed(null); // will use fallback
    } finally {
      setFeedLoading(false);
    }
  }, []);

  // Fetch total claims paid to this worker
  const fetchTotalProtected = useCallback(async () => {
    try {
      const id = workerId || "WRK-DEFAULT";
      const res = await fetch(`/api/claims?worker_id=${id}`, { cache: "no-store" });
      const data = await res.json();
      setTotalProtected(data.total || 0);
    } catch {
      setTotalProtected(parseInt(earnings || 6000) * 0.22);
    }
  }, [workerId, earnings]);

  useEffect(() => {
    fetchFeed();
    fetchTotalProtected();
    // Poll feed every 30 seconds for live updates
    const interval = setInterval(fetchFeed, 30000);
    return () => clearInterval(interval);
  }, [fetchFeed, fetchTotalProtected]);

  async function simulateDisruption() {
    setSimulating(true);
    try {
      // Call the real trigger API
      const res = await fetch("/api/triggers/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "rain",
          value: 58.2,
          city: pinData.city,
          pin_code: data.pinCode || "600001",
          worker_id: workerId || "WRK-DEFAULT",
          tier: tier || "standard",
        }),
      });
      const result = await res.json();
      setPayoutAmount(result.payout_amount || tierObj.max * 0.45);
    } catch {
      setPayoutAmount(Math.round(tierObj.max * 0.45));
    }
    setTimeout(() => {
      setSimulating(false);
      setShowUPI(true);
    }, 1800);
  }

  function handleUPIComplete() {
    setShowUPI(false);
    setPayout({ amount: payoutAmount, trigger: "Heavy Rainfall", time: new Date().toLocaleTimeString() });
    setTotalProtected(p => p + payoutAmount);
    // Refresh claims list
    fetchTotalProtected();
  }

  async function saveProfile(e) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileStatus("");

    const nextPinData = PIN_RISK[profileForm.pinCode];
    const response = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...profileForm,
        nfi: nextPinData?.nfi || data.nfi || 55,
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setProfileStatus(result?.error || "Could not update your profile.");
      setProfileSaving(false);
      return;
    }

    onProfileUpdated?.(result.user);
    setProfileStatus("✅ Profile updated successfully.");
    setProfileSaving(false);
  }

  // Use DB feed or fallback to mock
  const feedToShow = disruptionFeed || [
    { id: 1, type: "rain",     icon: "🌧", title: "Heavy Rainfall Alert",  desc: "58mm in 2 hrs — threshold crossed",      city: "Chennai",   time: "2 min ago",  severity: "high"   },
    { id: 2, type: "heat",     icon: "🌡", title: "Heat Stress Index",      desc: "Feels-like 44°C — outdoor work unsafe",  city: "Hyderabad", time: "8 min ago",  severity: "high"   },
    { id: 3, type: "aqi",      icon: "💨", title: "Severe AQI Warning",     desc: "AQI 387 — Very Poor air quality",         city: "Delhi",     time: "15 min ago", severity: "medium" },
    { id: 4, type: "flood",    icon: "🌊", title: "Waterlogging Alert",     desc: "Pin-code 600028 — Red alert issued",      city: "Chennai",   time: "22 min ago", severity: "high"   },
    { id: 5, type: "platform", icon: "📵", title: "Platform Downtime",      desc: "Swiggy outage detected — 95 min",         city: "Mumbai",    time: "31 min ago", severity: "medium" },
    { id: 6, type: "curfew",   icon: "🚧", title: "Local Curfew",           desc: "Section 144 — Shahdara zone",             city: "Delhi",     time: "45 min ago", severity: "high"   },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: "#9B9589" }}>Welcome back,</div>
          <h2 style={{ fontFamily: "serif", fontSize: 20, margin: 0, color: "#1A1512" }}>{name}</h2>
          <div style={{ fontSize: 11, color: "#6B6258", marginTop: 1 }}>{platform} · {pinData.zone}, {pinData.city}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", background: "#E8F5EE", borderRadius: 20 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4CAF82", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "#2D6B4A" }}>Active</span>
          </div>
          <div style={{ fontSize: 9, color: "#9B9589" }}>{tierObj?.name} Plan</div>
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

      {/* ── DASHBOARD TAB ── */}
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

          {/* KPI Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[
              { label: "Protected",  value: `₹${Math.round(totalProtected).toLocaleString()}`, sub: "this month",         color: "#4CAF82" },
              { label: "Premium",    value: `₹${premium}`,                                      sub: tierObj?.name || "Standard", color: "#FF6B35" },
              { label: "NFI score",  value: nfi,                                                 sub: nfi > 65 ? "High risk" : nfi > 40 ? "Moderate" : "Low risk", color: nfi > 65 ? "#EF4444" : "#F59E0B" },
            ].map((s, i) => (
              <div key={i} style={{ padding: "10px 8px", background: "#FAFAF8", border: "1px solid #E0D9D0", borderRadius: 12, textAlign: "center" }}>
                <div style={{ fontFamily: "serif", fontSize: 17, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 9, fontWeight: 600, color: "#1A1512", marginTop: 2 }}>{s.label}</div>
                <div style={{ fontSize: 9, color: "#9B9589" }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Coverage chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
            {(coverage || tierObj?.coverage || []).map((c, i) => (
              <span key={i} style={{ fontSize: 10, padding: "2px 8px", background: "#E8F5EE", color: "#2D6B4A", borderRadius: 20, fontWeight: 600 }}>✓ {c}</span>
            ))}
          </div>

          {/* Trigger simulation */}
          {showUPI ? (
            <UPIPaymentFlow amount={payoutAmount} onComplete={handleUPIComplete} />
          ) : (
            <button
              onClick={simulateDisruption}
              disabled={simulating || !!payout}
              style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: simulating ? "#E0D9D0" : payout ? "#E8F5EE" : "#1A1512", color: simulating ? "#6B6258" : payout ? "#2D6B4A" : "#fff", fontSize: 13, fontWeight: 700, cursor: simulating || payout ? "default" : "pointer", marginBottom: 12, transition: "all 0.3s" }}
            >
              {simulating ? "⏳ Detecting disruption..." : payout ? "✓ Payout processed" : "🌧 Simulate disruption trigger"}
            </button>
          )}

          {payout && !showUPI && (
            <div style={{ padding: "14px", background: "#E8F5EE", border: "2px solid #4CAF82", borderRadius: 14, marginBottom: 12, animation: "slideIn 0.4s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#2D6B4A" }}>✅ Auto-payout processed</div>
                  <div style={{ fontSize: 11, color: "#4A7C5E", marginTop: 2 }}>Trigger: {payout.trigger} · {payout.time}</div>
                  <div style={{ fontSize: 11, color: "#4A7C5E" }}>UPI transfer complete · Ref: GS{Date.now().toString().slice(-8)}</div>
                </div>
                <div style={{ fontFamily: "serif", fontSize: 26, color: "#2D6B4A" }}>₹{payout.amount}</div>
              </div>
            </div>
          )}

          {/* Live disruption feed */}
          <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>Live disruption feed</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {feedLoading ? (
                <span style={{ fontSize: 10, color: "#9B9589" }}>Loading...</span>
              ) : (
                <>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#EF4444", animation: "pulse 1.5s infinite" }} />
                  <span style={{ fontSize: 10, color: "#9B9589" }}>Live</span>
                </>
              )}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {feedToShow.slice(0, 6).map((item, idx) => (
              <div key={item.id || idx} style={{ display: "flex", gap: 10, padding: "9px 11px", background: "#FAFAF8", border: "1px solid #E0D9D0", borderRadius: 10, alignItems: "center" }}>
                <div style={{ fontSize: 18 }}>{item.icon || "⚡"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#1A1512" }}>{item.title}</div>
                  <div style={{ fontSize: 10, color: "#6B6258" }}>{item.desc || item.description}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <Badge text={item.severity} color={SEV_COLOR[item.severity] || "#9B9589"} bg={item.severity === "high" ? "#FEE2E2" : "#FEF3C7"} />
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
      {activeTab === "claims"   && <ClaimsHistory workerId={workerId || "WRK-DEFAULT"} />}
      {activeTab === "policy"   && <PolicyReceipt data={data} />}
      {activeTab === "whatsapp" && <WhatsAppScreen />}

      {/* ── PROFILE TAB ── */}
      {activeTab === "profile" && (
        <form onSubmit={saveProfile} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ padding: "12px 14px", background: "#FAFAF8", border: "1px solid #E0D9D0", borderRadius: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1512", marginBottom: 4 }}>Personal details</div>
            <div style={{ fontSize: 11, color: "#6B6258" }}>Update your profile and coverage details.</div>
          </div>

          {[
            { key: "name",     label: "Full name",       type: "text",   placeholder: "e.g. Ravi Kumar" },
            { key: "email",    label: "Email",           type: "email",  placeholder: "you@example.com" },
            { key: "phone",    label: "Phone (optional)",type: "tel",    placeholder: "+91 98765 43210" },
            { key: "pinCode",  label: "Pin code",        type: "text",   placeholder: "e.g. 600001", maxLength: 6 },
            { key: "earnings", label: "Weekly earnings (₹)", type: "number", placeholder: "e.g. 6000" },
          ].map(field => (
            <label key={field.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1512" }}>{field.label}</span>
              <input
                type={field.type}
                value={profileForm[field.key]}
                maxLength={field.maxLength}
                placeholder={field.placeholder}
                onChange={e => {
                  let val = e.target.value;
                  if (field.key === "pinCode") val = val.replace(/\D/g, "");
                  setProfileForm(f => ({ ...f, [field.key]: val }));
                }}
                style={{ padding: "11px 14px", borderRadius: 10, border: "1.5px solid #E0D9D0", fontSize: 14, background: "#FAFAF8", outline: "none" }}
              />
              {field.key === "pinCode" && profileForm.pinCode.length === 6 && PIN_RISK[profileForm.pinCode] && (
                <div style={{ fontSize: 11, color: "#2D6B4A", background: "#E8F5EE", padding: "4px 10px", borderRadius: 6 }}>
                  📍 {PIN_RISK[profileForm.pinCode].zone}, {PIN_RISK[profileForm.pinCode].city} — NFI: {PIN_RISK[profileForm.pinCode].nfi}
                </div>
              )}
            </label>
          ))}

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1512" }}>Platform</span>
            <div style={{ display: "flex", gap: 8 }}>
              {["Zomato", "Swiggy"].map(p => (
                <button key={p} type="button" onClick={() => setProfileForm(f => ({ ...f, platform: p }))} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1.5px solid", borderColor: profileForm.platform === p ? "#FF6B35" : "#E0D9D0", background: profileForm.platform === p ? "#FFF0EB" : "#FAFAF8", color: profileForm.platform === p ? "#FF6B35" : "#6B6258", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                  {p}
                </button>
              ))}
            </div>
          </label>

          {profileStatus && (
            <div style={{ padding: "10px 12px", background: profileStatus.includes("✅") ? "#E8F5EE" : "#FEE2E2", borderRadius: 10, fontSize: 12, color: profileStatus.includes("✅") ? "#2D6B4A" : "#991B1B" }}>
              {profileStatus}
            </div>
          )}

          <button type="submit" disabled={profileSaving} style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: "#FF6B35", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: profileSaving ? 0.7 : 1 }}>
            {profileSaving ? "Saving..." : "Save details"}
          </button>

          <button type="button" onClick={onSignOut} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1.5px solid #E0D9D0", background: "#fff", color: "#6B6258", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Sign out
          </button>
        </form>
      )}
    </div>
  );
}
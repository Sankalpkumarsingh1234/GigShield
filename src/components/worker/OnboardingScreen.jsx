"use client";
import { useState } from "react";
import { PIN_RISK } from "@/data/pinRisk";
import { Badge, labelStyle, labelText, inputStyle, ctaBtn } from "@/components/ui";

export default function OnboardingScreen({ onNext }) {
  const [form, setForm] = useState({ name: "", pin: "", platform: "Zomato", earnings: "" });
  const [pinData, setPinData] = useState(null);
  const [pinError, setPinError] = useState("");

  function handlePin(val) {
    setForm(f => ({ ...f, pin: val }));
    if (val.length === 6) {
      const data = PIN_RISK[val];
      if (data) { setPinData(data); setPinError(""); }
      else      { setPinData(null); setPinError("Pin code not in network yet — using city average."); }
    } else { setPinData(null); setPinError(""); }
  }

  const valid = form.name && form.pin.length === 6 && form.earnings;

  return (
    <div>
      <div style={{ marginBottom: 6 }}><Badge text="Step 1 of 4" /></div>
      <h2 style={{ fontFamily: "serif", fontSize: 26, margin: "8px 0 4px", color: "#1A1512" }}>Let's set up your shield</h2>
      <p style={{ fontSize: 14, color: "#6B6258", marginBottom: 24 }}>Takes 60 seconds. No documents needed.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label style={labelStyle}>
          <span style={labelText}>Your name</span>
          <input style={inputStyle} placeholder="e.g. Ravi Kumar" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </label>
        <label style={labelStyle}>
          <span style={labelText}>Platform</span>
          <div style={{ display: "flex", gap: 8 }}>
            {["Zomato", "Swiggy"].map(p => (
              <button key={p} onClick={() => setForm(f => ({ ...f, platform: p }))} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1.5px solid", borderColor: form.platform === p ? "#FF6B35" : "#E0D9D0", background: form.platform === p ? "#FFF0EB" : "#FAFAF8", color: form.platform === p ? "#FF6B35" : "#6B6258", fontWeight: 600, fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}>{p}</button>
            ))}
          </div>
        </label>
        <label style={labelStyle}>
          <span style={labelText}>Operating pin code</span>
          <input style={inputStyle} placeholder="e.g. 600001" maxLength={6} value={form.pin} onChange={e => handlePin(e.target.value.replace(/\D/g, ""))} />
          {pinData  && <div style={{ marginTop: 6, padding: "8px 12px", background: "#E8F5EE", borderRadius: 8, fontSize: 12, color: "#2D6B4A" }}>📍 {pinData.zone}, {pinData.city} — {pinData.reason}</div>}
          {pinError && <div style={{ marginTop: 6, fontSize: 12, color: "#B45309" }}>{pinError}</div>}
        </label>
        <label style={labelStyle}>
          <span style={labelText}>Average weekly earnings (₹)</span>
          <input style={inputStyle} placeholder="e.g. 6000" type="number" value={form.earnings} onChange={e => setForm(f => ({ ...f, earnings: e.target.value }))} />
        </label>
      </div>
      <button onClick={() => valid && onNext({ ...form, pinData: pinData || { nfi: 55, city: "Your city", zone: "Area", reason: "Average risk" } })} style={{ ...ctaBtn, opacity: valid ? 1 : 0.45, marginTop: 28 }}>
        Calculate my risk profile →
      </button>
    </div>
  );
}

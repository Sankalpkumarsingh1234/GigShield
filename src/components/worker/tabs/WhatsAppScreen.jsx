"use client";
import { useState, useEffect, useRef } from "react";
import { WHATSAPP_FLOW } from "@/data/mockData";

export default function WhatsAppScreen() {
  const [visible, setVisible] = useState([]);
  const [step, setStep]       = useState(0);
  const chatRef               = useRef(null);
  const isRunning             = useRef(false);

  async function runFlow() {
    if (isRunning.current) return;
    isRunning.current = true;
    setVisible([]); setStep(0);
    for (let i = 0; i < WHATSAPP_FLOW.length; i++) {
      await new Promise(r => setTimeout(r, i === 0 ? 300 : 900));
      setVisible(v => [...v, WHATSAPP_FLOW[i]]);
      setStep(i + 1);
      setTimeout(() => chatRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);
    }
    isRunning.current = false;
  }

  useEffect(() => { runFlow(); }, []);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "serif", fontSize: 18, color: "#1A1512" }}>WhatsApp Onboarding</div>
          <div style={{ fontSize: 11, color: "#6B6258" }}>Zero-app enrollment via chat</div>
        </div>
        <button onClick={runFlow} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #E0D9D0", background: "#FAFAF8", fontSize: 12, fontWeight: 600, color: "#6B6258", cursor: "pointer" }}>↺ Replay</button>
      </div>
      <div style={{ background: "#1A1512", borderRadius: 18, padding: "0 0 10px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <div style={{ background: "#075E54", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🛵</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>GigShield</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 10 }}>Business Account · {step < WHATSAPP_FLOW.length ? "typing..." : "online"}</div>
          </div>
        </div>
        <div ref={chatRef} style={{ background: "#ECE5DD", padding: "10px", minHeight: 280, maxHeight: 340, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          {visible.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.from === "user" ? "flex-end" : "flex-start", animation: "slideIn 0.3s ease" }}>
              <div style={{ maxWidth: "78%", padding: "7px 11px", borderRadius: msg.from === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: msg.from === "user" ? "#DCF8C6" : "#fff", fontSize: 12, color: "#1A1512", lineHeight: 1.5, boxShadow: "0 1px 2px rgba(0,0,0,0.1)", whiteSpace: "pre-wrap" }}>
                {msg.text}
                <div style={{ fontSize: 9, color: "#9B9589", textAlign: "right", marginTop: 2 }}>
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} {msg.from === "user" ? "✓✓" : ""}
                </div>
              </div>
            </div>
          ))}
          {step > 0 && step < WHATSAPP_FLOW.length && (
            <div style={{ display: "flex" }}>
              <div style={{ background: "#fff", borderRadius: "12px 12px 12px 2px", padding: "9px 13px", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                <div style={{ display: "flex", gap: 3 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#9B9589", animation: `pulse 1.2s ${i * 0.2}s infinite` }} />)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div style={{ marginTop: 10, padding: "8px 12px", background: "#E8F5EE", borderRadius: 8, fontSize: 11, color: "#2D6B4A" }}>
        ✓ Full enrollment in 8 messages · No app download · WhatsApp Business API
      </div>
    </div>
  );
}

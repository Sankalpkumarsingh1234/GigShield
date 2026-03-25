"use client";
import { useState, useRef } from "react";
import { TIERS } from "@/data/mockData";
import { inputStyle } from "@/components/ui";

export default function AIChatAssistant({ userData }) {
  const firstName  = userData?.name?.split(" ")[0] || "there";
  const tierObj    = TIERS.find(t => t.id === (userData?.tier || "standard"));
  const [messages, setMessages] = useState([
    { role: "assistant", text: `Hi ${firstName}! 👋 I'm your GigShield AI assistant. Ask me anything about your coverage, premium, or disruption triggers.` },
  ]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

  const QUICK_QUESTIONS = [
    "Am I covered for heat stress?",
    `Why is my premium ₹${userData?.premium || 54}?`,
    "When does rain trigger a payout?",
    "How do I get my payout faster?",
  ];

  const systemPrompt = `You are GigShield's AI assistant — a friendly, concise insurance advisor for Indian food delivery workers (Zomato/Swiggy riders).

Worker context:
- Name: ${userData?.name || "Unknown"}
- Platform: ${userData?.platform || "Zomato"}
- Zone: ${userData?.pinData?.zone || "Anna Nagar"}, ${userData?.pinData?.city || "Chennai"}
- NFI Risk Score: ${userData?.nfi || 72}/100
- Plan: ${userData?.tier || "Standard"} plan at ₹${userData?.premium || 54}/week
- Max payout: ₹${tierObj?.max || 1000}/week
- Coverage: ${tierObj?.coverage?.join(", ") || "Rain, Flooding, AQI, Curfew"}
- Weekly earnings: ~₹${userData?.earnings || 6000}

GigShield rules:
- Parametric insurance: payouts are automatic when external triggers are crossed — no manual claims
- Triggers: Rain >35mm/2hrs, Heat Index >42°C, AQI >350, Platform outage >90min, Zone curfew
- Heat Index uses Rothfusz formula (temp + humidity)
- Premiums deducted every Monday via UPI
- No coverage for vehicle repairs, health, accidents, or life insurance
- Storm Window alerts sent 6hrs before predicted disruptions; workers can top up for ₹8

Keep answers short (2-4 sentences), friendly, in simple English.`;

  async function sendMessage(text) {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user", text };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setLoading(true);
    setTimeout(() => chatRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }));
      const res  = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, messages: history, workerId: userData?.workerId || "WRK-DEFAULT" }),
      });
      const data  = await res.json();
      const reply = data.content?.[0]?.text || "Sorry, I couldn't process that. Please try again.";
      setMessages(m => [...m, { role: "assistant", text: reply }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", text: "I'm having trouble connecting right now. Please try again in a moment." }]);
    }
    setLoading(false);
    setTimeout(() => chatRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 100);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>Ask GigShield AI</div>
          <div style={{ fontSize: 11, color: "#9B9589" }}>Powered by Groq · Knows your policy & claims</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: "#EDE9FE", borderRadius: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7C3AED", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: "#7C3AED" }}>AI Live</span>
        </div>
      </div>
      <div ref={chatRef} style={{ background: "#FAFAF8", border: "1px solid #E0D9D0", borderRadius: 14, padding: "12px", height: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", animation: "slideIn 0.3s ease" }}>
            {m.role === "assistant" && <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#FF6B35", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, marginRight: 6, flexShrink: 0, alignSelf: "flex-end" }}>🛡</div>}
            <div style={{ maxWidth: "80%", padding: "8px 11px", borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: m.role === "user" ? "#FF6B35" : "#fff", color: m.role === "user" ? "#fff" : "#1A1512", fontSize: 12, lineHeight: 1.5, border: m.role === "assistant" ? "1px solid #E0D9D0" : "none" }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#FF6B35", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>🛡</div>
            <div style={{ background: "#fff", borderRadius: "12px 12px 12px 2px", padding: "10px 14px", border: "1px solid #E0D9D0" }}>
              <div style={{ display: "flex", gap: 3 }}>{[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#9B9589", animation: `pulse 1.2s ${i * 0.2}s infinite` }} />)}</div>
            </div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {QUICK_QUESTIONS.map((q, i) => (
          <button key={i} onClick={() => sendMessage(q)} style={{ padding: "4px 10px", borderRadius: 20, border: "1px solid #E0D9D0", background: "#fff", fontSize: 11, color: "#6B6258", cursor: "pointer" }}>{q}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage(input)} placeholder="Ask about your coverage..." style={{ ...inputStyle, flex: 1, fontSize: 13 }} />
        <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: input.trim() && !loading ? "#FF6B35" : "#E0D9D0", color: "#fff", fontWeight: 700, fontSize: 13, cursor: input.trim() && !loading ? "pointer" : "default" }}>
          {loading ? "..." : "→"}
        </button>
      </div>
    </div>
  );
}

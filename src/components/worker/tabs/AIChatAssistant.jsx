"use client";
import { useState, useRef, useCallback } from "react";
import { TIERS } from "@/data/mockData";
import { inputStyle } from "@/components/ui";

export default function AIChatAssistant({ userData }) {
  const firstName = userData?.name?.split(" ")[0] || "there";
  const tierObj   = TIERS.find(t => t.id === (userData?.tier || "standard")) || TIERS[1];

  const [messages, setMessages] = useState([{
    role: "assistant",
    text: `Hi ${firstName}! 👋 I'm your GigShield AI assistant.\n\nI can see your ${tierObj?.name || "Standard"} plan, your claims history, and your zone's risk profile. Ask me anything about your coverage, payouts, or disruption triggers.`,
  }]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

  const QUICK_QUESTIONS = [
    "When does rain trigger my payout?",
    `Why is my premium ₹${userData?.premium || 54}/week?`,
    "How much would I get for a heat trigger?",
    "Am I covered for platform outages?",
    "What's my NFI risk score mean?",
    "How fast do payouts hit my UPI?",
  ];

  // System prompt (DB enrichment happens server-side in /api/chat)
  const systemPrompt = `You are GigShield's AI assistant — a friendly, concise insurance advisor for Indian food delivery workers (Zomato/Swiggy riders).

GigShield provides parametric insurance: automatic payouts when external triggers are crossed. No manual claims, ever.

Worker context:
- Name: ${userData?.name || "Unknown"}
- Platform: ${userData?.platform || "Zomato"}
- Zone: ${userData?.pinData?.zone || "Anna Nagar"}, ${userData?.pinData?.city || "Chennai"}
- NFI Risk Score: ${userData?.nfi || 72}/100 (${userData?.nfi > 65 ? "High risk zone" : userData?.nfi > 40 ? "Moderate risk" : "Low risk"})
- Plan: ${userData?.tier || "Standard"} plan at ₹${userData?.premium || 54}/week
- Max payout: ₹${tierObj?.max || 1000}/week
- Coverage: ${(tierObj?.coverage || []).join(", ")}
- Weekly earnings: ~₹${userData?.earnings || 6000}

Always be accurate, brief (2-4 sentences), and friendly. Use ₹ symbol. Never suggest calling a helpline.`;

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: "user", text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setTimeout(() => chatRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);

    try {
      const history = [...messages, userMsg].map(m => ({
        role:    m.role === "assistant" ? "assistant" : "user",
        content: m.text,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          messages:   history,
          workerId:   userData?.workerId || userData?.id || "WRK-DEFAULT",
          workerData: userData,
        }),
      });

      const data  = await res.json();
      const reply = data.content?.[0]?.text || "Sorry, I couldn't process that. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);

    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "I'm having trouble connecting right now. Please try again in a moment.",
      }]);
    }

    setLoading(false);
    setTimeout(() => chatRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 100);
  }, [messages, loading, systemPrompt, userData]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>Ask GigShield AI</div>
          <div style={{ fontSize: 11, color: "#9B9589" }}>Powered by Groq · Knows your policy & claim history</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: "#EDE9FE", borderRadius: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7C3AED", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: "#7C3AED" }}>AI Live</span>
        </div>
      </div>

      {/* Chat area */}
      <div
        ref={chatRef}
        style={{ background: "#FAFAF8", border: "1px solid #E0D9D0", borderRadius: 14, padding: "12px", height: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 10, scrollBehavior: "smooth" }}
      >
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", animation: "slideIn 0.3s ease" }}>
            {m.role === "assistant" && (
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#FF6B35", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, marginRight: 6, flexShrink: 0, alignSelf: "flex-end" }}>
                🛡
              </div>
            )}
            <div style={{
              maxWidth: "80%",
              padding: "9px 12px",
              borderRadius: m.role === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
              background: m.role === "user" ? "#FF6B35" : "#fff",
              color:      m.role === "user" ? "#fff" : "#1A1512",
              fontSize: 12, lineHeight: 1.55,
              border: m.role === "assistant" ? "1px solid #E0D9D0" : "none",
              whiteSpace: "pre-line",
            }}>
              {m.text}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#FF6B35", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>🛡</div>
            <div style={{ background: "#fff", borderRadius: "14px 14px 14px 2px", padding: "10px 14px", border: "1px solid #E0D9D0" }}>
              <div style={{ display: "flex", gap: 3 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#9B9589", animation: `pulse 1.2s ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick questions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
        {QUICK_QUESTIONS.map((q, i) => (
          <button
            key={i}
            onClick={() => sendMessage(q)}
            disabled={loading}
            style={{ padding: "4px 10px", borderRadius: 20, border: "1px solid #E0D9D0", background: "#fff", fontSize: 10, color: "#6B6258", cursor: "pointer", transition: "all 0.15s" }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
          placeholder="Ask about your coverage, payouts, or triggers…"
          style={{ ...inputStyle, flex: 1, fontSize: 13 }}
          disabled={loading}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          style={{
            padding: "10px 16px", borderRadius: 10, border: "none",
            background: input.trim() && !loading ? "#FF6B35" : "#E0D9D0",
            color: "#fff", fontWeight: 700, fontSize: 14,
            cursor: input.trim() && !loading ? "pointer" : "default",
            transition: "background 0.2s",
          }}
        >
          {loading ? "…" : "→"}
        </button>
      </div>
    </div>
  );
}
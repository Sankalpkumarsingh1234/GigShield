import { query } from "@/lib/db";

async function getWorkerClaims(workerId) {
  try {
    const { rows } = await query(
      `SELECT claim_id, trigger_type, trigger_value, city, amount, status,
              TO_CHAR(created_at, 'Mon DD, YYYY') AS date
       FROM claims WHERE worker_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [workerId || "WRK-DEFAULT"]
    );
    return rows;
  } catch {
    return [];
  }
}

export async function POST(request) {
  try {
    const { messages, systemPrompt, workerId } = await request.json();

    if (!messages || !systemPrompt) {
      return Response.json({ error: "messages and systemPrompt required" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;

    const claims = await getWorkerClaims(workerId);
    const claimsSummary = claims.length > 0
      ? claims.map(c =>
          `  • ${c.date}: ${c.trigger_type} in ${c.city} → ₹${c.amount} paid${c.trigger_value ? ` (value: ${c.trigger_value})` : ""}`
        ).join("\n")
      : "  No claims on record yet.";

    const enrichedSystemPrompt = `${systemPrompt}

Recent claims from database (${claims.length} records):
${claimsSummary}

Parametric trigger thresholds (all auto-pay, no manual claims needed):
- Rain: >35mm in 2 hours → payout
- Heat Index (Rothfusz formula): >42°C feels-like → payout
- AQI: >350 (Severe category) → payout
- Platform outage: >90 minutes continuous → payout
- Zone curfew: declared curfew → payout

Fraud prevention: Every claim is auto-checked via a 4-signal Isolation Forest model (GPS match, claim frequency, activity patterns, earnings baseline). Score >75 flags for manual review.

Response style: 2-4 sentences max. Friendly, simple English. Use ₹ symbol. Never suggest calling a helpline (everything is instant and automatic).`;

    if (!apiKey) {
      return Response.json({
        content: [{ type: "text", text: "I'm GigShield's AI assistant in demo mode. Add a GROQ_API_KEY for live AI responses. Your claim history and policy details are already loaded — I'm ready to help once the key is set!" }],
        mock: true,
      });
    }

    const groqMessages = messages.map(msg => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    }));

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: enrichedSystemPrompt },
          ...groqMessages,
        ],
        max_tokens: 300,
        temperature: 0.65,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("Groq API error:", error);
      return Response.json({
        content: [{ type: "text", text: "I'm having a moment of trouble. Please try again in a few seconds." }],
        mock: true,
      });
    }

    const data = await response.json();
    const groqText = data.choices?.[0]?.message?.content || "Sorry, I couldn't process that.";

    return Response.json({ content: [{ type: "text", text: groqText }] });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { content: [{ type: "text", text: "I'm having trouble connecting right now. Please try again in a moment." }], mock: true },
      { status: 500 }
    );
  }
}

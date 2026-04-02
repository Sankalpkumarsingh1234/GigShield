import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const GROQ_MODEL    = "llama-3.3-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const TIER_CONFIG = {
  basic:    { name: "Basic",    max: 500,  coverage: ["Heavy rain", "Flooding"] },
  standard: { name: "Standard", max: 1000, coverage: ["Rain", "Flooding", "AQI", "Curfew"] },
  premium:  { name: "Premium",  max: 2000, coverage: ["Rain", "Flooding", "AQI", "Curfew", "Heat Stress", "Platform outage"] },
};

// ── Fetch worker context from DB ─────────────────────────────────────────────
async function getWorkerContext(workerId) {
  if (!workerId || workerId === "WRK-DEFAULT") {
    return { claims: [], policy: null, totalPaid: 0 };
  }

  try {
    const [claimsResult, policyResult] = await Promise.allSettled([
      query(`
        SELECT claim_id, trigger_type, trigger_value, city, amount, status,
               TO_CHAR(created_at, 'Mon DD') AS date
        FROM claims
        WHERE worker_id = $1
        ORDER BY created_at DESC
        LIMIT 8
      `, [workerId]),
      query(`
        SELECT p.tier, p.premium, p.max_payout, p.coverage,
               p.total_paid_out, p.total_paid_in,
               TO_CHAR(p.activated_at, 'Mon DD, YYYY') AS since
        FROM policies p
        WHERE p.user_id = $1::uuid AND p.active = true
        LIMIT 1
      `, [workerId]).catch(() => ({ rows: [] })),
    ]);

    const claims = claimsResult.status === "fulfilled" ? claimsResult.value.rows : [];
    const policy = policyResult.status === "fulfilled" ? policyResult.value.rows[0] : null;
    const totalPaid = claims.reduce((s, c) => s + (c.amount || 0), 0);

    return { claims, policy, totalPaid };
  } catch (err) {
    console.warn("Worker context fetch failed:", err.message);
    return { claims: [], policy: null, totalPaid: 0 };
  }
}

// ── Build system prompt with full DB context ──────────────────────────────────
function buildSystemPrompt(basePrompt, workerData, dbContext) {
  const { claims, policy, totalPaid } = dbContext;
  const tierCfg = TIER_CONFIG[workerData?.tier || "standard"];

  const claimsSummary = claims.length > 0
    ? claims.map(c =>
        `  • ${c.date}: ${c.trigger_type} in ${c.city} → ₹${c.amount} ${c.status}${c.trigger_value ? ` (value: ${c.trigger_value})` : ""}`
      ).join("\n")
    : "  No claims on record yet.";

  return `${basePrompt}

══════════════════════════════════════════
WORKER PROFILE (live from DB):
  Name: ${workerData?.name || "Unknown"}
  Platform: ${workerData?.platform || "Zomato"}
  Zone: ${workerData?.pinData?.zone || "Anna Nagar"}, ${workerData?.pinData?.city || "Chennai"}
  NFI Risk Score: ${workerData?.nfi || 72}/100 (${workerData?.nfi > 65 ? "High" : workerData?.nfi > 40 ? "Moderate" : "Low"} risk)
  Weekly earnings: ~₹${workerData?.earnings || 6000}

ACTIVE POLICY (live from DB):
  Plan: ${tierCfg?.name || "Standard"} at ₹${workerData?.premium || 54}/week
  Max weekly payout: ₹${tierCfg?.max || 1000}
  Coverage: ${(tierCfg?.coverage || []).join(", ")}
  Active since: ${policy?.since || "recently"}
  Total paid out to worker: ₹${policy?.total_paid_out || totalPaid}

CLAIMS HISTORY (last 8, from DB):
${claimsSummary}

══════════════════════════════════════════
PARAMETRIC TRIGGER THRESHOLDS:
  🌧 Rain: >35mm in 2 hours → auto-payout
  🌡 Heat: Feels-like >42°C (Rothfusz formula: temp + humidity) → auto-payout
  💨 AQI: >350 (Severe category) → auto-payout
  📵 Platform outage: >90 minutes continuous → auto-payout
  🚧 Zone curfew: Section 144 declared → auto-payout
  🌊 Waterlogging: >35mm accumulation → auto-payout

PAYOUT RANGES BY TIER:
  Basic: ₹175–₹500/week | Standard: ₹420–₹1000/week | Premium: ₹1000–₹2000/week
  (Severity multiplier: higher above threshold = higher payout %)

FRAUD MODEL: Every claim auto-scored 0–100 using Isolation Forest (GPS, frequency, activity, earnings). Score >75 = manual review.

══════════════════════════════════════════
RESPONSE RULES:
  • 2-4 sentences max. Friendly, simple English. Use ₹ not Rs.
  • Never suggest calling a helpline. Everything is automatic.
  • If asked about payout timing: "Within 2 minutes of threshold breach, to your UPI."
  • If asked about filing a claim: "No action needed — payouts are 100% automatic."
  • If asked about coverage gaps: suggest upgrading to the next tier.
  • If unsure, say so honestly in ≤2 sentences.`;
}

// ── Main POST handler ─────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const { messages, systemPrompt, workerId, workerData } = await request.json();

    if (!messages || !systemPrompt) {
      return Response.json({ error: "messages and systemPrompt required" }, { status: 400 });
    }

    // Fetch real DB context in parallel
    const dbContext = await getWorkerContext(workerId);
    const enrichedSystemPrompt = buildSystemPrompt(systemPrompt, workerData, dbContext);

    const apiKey = process.env.GROQ_API_KEY;

    // No API key → informative demo response
    if (!apiKey) {
      const demoResponses = [
        `Hi! I'm GigShield AI (demo mode — add GROQ_API_KEY to enable live responses). Based on your profile, you have ${dbContext.claims.length} claims on record totalling ₹${dbContext.claims.reduce((s,c) => s + c.amount, 0)}.`,
        "Your coverage automatically pays out when rain exceeds 35mm/2hrs, heat feels like >42°C, AQI goes above 350, or a platform outage lasts >90 minutes. No claims needed — it's all instant.",
        "Add GROQ_API_KEY from console.groq.com (free) to enable full AI responses with your actual claim history and policy context.",
      ];
      return Response.json({
        content: [{
          type: "text",
          text: demoResponses[Math.floor(Math.random() * demoResponses.length)],
        }],
        _demo: true,
      });
    }

    // Format conversation for Groq
    const groqMessages = messages.map(m => ({
      role: m.role === "user" ? "user" : "assistant",
      content: typeof m.content === "string" ? m.content : m.text || "",
    }));

    // Call Groq API
    const groqRes = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        model:             GROQ_MODEL,
        messages: [
          { role: "system", content: enrichedSystemPrompt },
          ...groqMessages,
        ],
        max_tokens:   350,
        temperature:  0.65,
        top_p:        0.9,
        // Stop sequences to prevent overly long responses
        stop: ["\n\n\n", "---"],
      }),
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.json().catch(() => ({}));
      console.error("Groq API error:", groqRes.status, errBody);

      // Rate limit → helpful message
      if (groqRes.status === 429) {
        return Response.json({
          content: [{
            type: "text",
            text: "I'm handling a lot of questions right now. Please try again in a moment.",
          }],
          _rateLimited: true,
        });
      }

      return Response.json({
        content: [{
          type: "text",
          text: "I'm having a moment of trouble connecting. Please try again in a few seconds.",
        }],
        _error: true,
      });
    }

    const groqData = await groqRes.json();
    const text = groqData.choices?.[0]?.message?.content || "Sorry, I couldn't process that.";

    return Response.json({
      content: [{ type: "text", text }],
      _tokens: groqData.usage,
      _model:  GROQ_MODEL,
    });

  } catch (error) {
    console.error("Chat route error:", error);
    return Response.json({
      content: [{
        type: "text",
        text: "I'm having trouble connecting right now. Please try again in a moment.",
      }],
      _error: error.message,
    }, { status: 500 });
  }
}
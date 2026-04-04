import { PIN_RISK } from "@/data/pinRisk";
import { query } from "@/lib/db";

const sessions = new Map();

const PLATFORM_CHOICES = {
  "1": "Zomato",
  "2": "Swiggy",
  zomato: "Zomato",
  swiggy: "Swiggy",
};

const TIER_CONFIG = {
  basic: { tier: "basic", name: "Basic", premium: 32, maxPayout: 500, coverage: ["Heavy rain", "Flood"] },
  standard: { tier: "standard", name: "Standard", premium: 54, maxPayout: 1000, coverage: ["Rain", "Flood", "AQI", "Curfew"] },
  premium: { tier: "premium", name: "Premium", premium: 79, maxPayout: 2000, coverage: ["Rain", "Flood", "AQI", "Curfew", "Heat Stress", "Platform outage"] },
};

function getSession(phone) {
  if (!sessions.has(phone)) {
    sessions.set(phone, { step: "awaiting_name" });
  }
  return sessions.get(phone);
}

function resetSession(phone) {
  sessions.delete(phone);
}

function chooseTier(nfi) {
  if (nfi >= 80) return TIER_CONFIG.premium;
  if (nfi >= 60) return TIER_CONFIG.standard;
  return TIER_CONFIG.basic;
}

function normalizeBody(body) {
  return (body || "").trim();
}

function formatCoverage(list) {
  return list.join(", ");
}

async function activatePolicy(session) {
  const tier = session.recommendation;

  try {
    const { rows: userRows } = await query(
      `INSERT INTO users (name, platform, pin_code, earnings, nfi)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [session.name, session.platform, session.pinCode, 6000, session.pinData.nfi]
    );

    const user = userRows[0];
    const { rows: policyRows } = await query(
      `INSERT INTO policies (user_id, tier, premium, max_payout, coverage, active, activated_at, next_billing_date, total_paid_in)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW() + INTERVAL '7 days', $3)
       RETURNING *`,
      [user.id, tier.tier, tier.premium, tier.maxPayout, tier.coverage]
    );

    return { user, policy: policyRows[0], mock: false };
  } catch (error) {
    console.error("WhatsApp activation fallback:", error);
    return {
      mock: true,
      user: {
        id: crypto.randomUUID(),
        name: session.name,
        platform: session.platform,
        pin_code: session.pinCode,
      },
      policy: {
        id: crypto.randomUUID(),
        tier: tier.tier,
        premium: tier.premium,
        max_payout: tier.maxPayout,
        coverage: tier.coverage,
      },
    };
  }
}

export async function handleWhatsAppOnboarding(phone, incomingBody) {
  const body = normalizeBody(incomingBody);
  const lower = body.toLowerCase();

  if (!body) {
    return "Send Hi to start onboarding.";
  }

  if (["reset", "restart", "start over"].includes(lower)) {
    resetSession(phone);
    return "Chat reset.\n\nWelcome to GigShield! Income protection for Zomato & Swiggy partners.\n\nReply with your name to get started.";
  }

  const session = getSession(phone);

  if (["hi", "hello", "hey", "start"].includes(lower) && session.step !== "awaiting_confirmation") {
    session.step = "awaiting_name";
    return "Welcome to GigShield! Income protection for Zomato & Swiggy partners.\n\nReply with your name to get started.";
  }

  if (session.step === "awaiting_name") {
    session.name = body;
    session.step = "awaiting_platform";
    return `Hi ${session.name}! Which platform do you ride for?\n\n1 Zomato\n2 Swiggy`;
  }

  if (session.step === "awaiting_platform") {
    const platform = PLATFORM_CHOICES[lower];
    if (!platform) {
      return "Please reply with 1 for Zomato or 2 for Swiggy.";
    }

    session.platform = platform;
    session.step = "awaiting_pin";
    return `Got it - ${platform}\n\nShare your operating pin code so I can check your zone's risk score.`;
  }

  if (session.step === "awaiting_pin") {
    const pinCode = body.replace(/\D/g, "");
    if (pinCode.length !== 6) {
      return "Please send a valid 6-digit pin code.";
    }

    const pinData = PIN_RISK[pinCode];
    if (!pinData) {
      return "That pin code is not in the demo network yet. Try 600001, 600028, 400053, 110001, or 500001.";
    }

    const recommendation = chooseTier(pinData.nfi);
    session.pinCode = pinCode;
    session.pinData = pinData;
    session.recommendation = recommendation;
    session.step = "awaiting_confirmation";

    const estimatedLoss = Math.round((pinData.nfi / 100) * 2000);
    return `${pinData.zone}, ${pinData.city} - NFI Risk Score: ${pinData.nfi}/100 (${pinData.nfi >= 70 ? "High" : "Moderate"})\n\nThis zone had ${Math.round(pinData.nfi * 0.4)} disruption days last year. Without coverage, you'd lose ~${estimatedLoss}/month.\n\nYour recommended plan: ${recommendation.name} (${recommendation.premium}/week)\n\nReply YES to activate`;
  }

  if (session.step === "awaiting_confirmation") {
    if (lower !== "yes") {
      return "Reply YES to activate your plan, or send RESET to restart the chat.";
    }

    const result = await activatePolicy(session);
    resetSession(phone);

    return `GigShield ${session.recommendation.name} activated!\n\n- Weekly premium: ${result.policy.premium} (debited every Monday)\n- Max payout: ${result.policy.max_payout}/week\n- Coverage: ${formatCoverage(result.policy.coverage || session.recommendation.coverage)}\n\nYou'll get alerts before disruptions and auto-payouts when triggers fire. Stay safe!${result.mock ? "\n\nDemo mode: database was unavailable, so this activation was not saved." : ""}`;
  }

  resetSession(phone);
  return "Welcome to GigShield! Income protection for Zomato & Swiggy partners.\n\nReply with your name to get started.";
}

import {
  hashPassword,
  ensureAuthSchema,
  isValidEmail,
  createSessionResponse,
  normalizeUser,
  normalizedEmail,
} from "@/lib/auth-server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const TIER_CONFIG = {
  basic:    { max_payout: 500,  coverage: ["Heavy rain", "Flooding"] },
  standard: { max_payout: 1000, coverage: ["Rain", "Flooding", "AQI", "Curfew"] },
  premium:  { max_payout: 2000, coverage: ["Rain", "Flooding", "AQI", "Curfew", "Heat Stress", "Platform outage"] },
};

export async function POST(request) {
  try {
    await ensureAuthSchema();

    const body = await request.json();
    const {
      name,
      email,
      password,
      phone,
      platform,
      pinCode,
      earnings,
      nfi,
      // Optional: policy created during onboarding
      tier,
      premium,
    } = body || {};

    // Validation
    if (!name || !email || !password || !platform || !pinCode) {
      return Response.json(
        { error: "name, email, password, platform, and pinCode are required" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return Response.json(
        { error: "Please enter a valid email address.", code: "invalid_email" },
        { status: 400 }
      );
    }

    if (String(password).length < 6) {
      return Response.json(
        { error: "Password must be at least 6 characters.", code: "weak_password" },
        { status: 400 }
      );
    }

    const normalized = normalizedEmail(email);

    // Check for existing user
    const existingUser = await query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [normalized]
    );

    if (existingUser.rows.length) {
      return Response.json(
        { error: "An account with this email already exists.", code: "email_already_exists" },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);

    // Create user
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, phone, platform, pin_code, earnings, nfi, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'worker')
       RETURNING id, email, name, platform, phone, pin_code, earnings, nfi, role, created_at`,
      [
        name.trim(),
        normalized,
        passwordHash,
        phone?.trim() || null,
        platform,
        pinCode,
        Number(earnings) || 0,
        Number(nfi) || 55,
      ]
    );

    const user = normalizeUser(rows[0]);

    // Auto-create a Standard policy if no tier specified, or use provided tier
    const policyTier = tier || "standard";
    const policyConfig = TIER_CONFIG[policyTier] || TIER_CONFIG.standard;
    const policyPremium = premium || 54;

    try {
      await query(
        `INSERT INTO policies (user_id, tier, premium, max_payout, coverage, active, activated_at, next_billing_date, total_paid_in)
         VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW() + INTERVAL '7 days', $3)`,
        [
          user.id,
          policyTier,
          policyPremium,
          policyConfig.max_payout,
          policyConfig.coverage,
        ]
      );
    } catch (policyErr) {
      // Non-critical: user is created, policy can be set up later
      console.warn("Policy creation failed during signup:", policyErr.message);
    }

    return createSessionResponse({ user }, user);
  } catch (error) {
    console.error("POST /api/auth/signup failed:", error);
    return Response.json({ error: "Unable to create account." }, { status: 500 });
  }
}
import { query, withTransaction } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

const TIER_CONFIG = {
  basic: {
    name: "Basic", max_payout: 500,
    coverage: ["Heavy rain", "Flooding"],
  },
  standard: {
    name: "Standard", max_payout: 1000,
    coverage: ["Rain", "Flooding", "AQI", "Curfew"],
  },
  premium: {
    name: "Premium", max_payout: 2000,
    coverage: ["Rain", "Flooding", "AQI", "Curfew", "Heat Stress", "Platform outage"],
  },
};

// GET /api/policies?user_id=xxx
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get("user_id");

    if (!userId) {
      const sessionUser = await getSessionUser();
      if (!sessionUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = sessionUser.id;
    }

    const { rows } = await query(`
      SELECT
        p.id, p.tier, p.premium, p.max_payout, p.coverage,
        p.active, p.activated_at, p.next_billing_date,
        p.total_paid_in, p.total_paid_out,
        TO_CHAR(p.activated_at, 'Mon DD, YYYY') AS since,
        TO_CHAR(p.next_billing_date, 'Mon DD, YYYY') AS next_billing,
        u.name AS worker_name, u.platform, u.pin_code, u.nfi, u.earnings,
        (SELECT COUNT(*) FROM claims c
         WHERE c.worker_id = u.id::text)::INT AS total_claims,
        (SELECT COALESCE(SUM(c.amount), 0) FROM claims c
         WHERE c.worker_id = u.id::text)::INT AS total_paid_out_db
      FROM policies p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = $1 AND p.active = true
      ORDER BY p.created_at DESC
      LIMIT 1
    `, [userId]);

    if (rows.length === 0) {
      return Response.json({ policy: null });
    }

    const policy = rows[0];
    const tierCfg = TIER_CONFIG[policy.tier] || TIER_CONFIG.standard;

    return Response.json({
      policy: {
        ...policy,
        tier_name: tierCfg.name,
        max_payout: policy.max_payout || tierCfg.max_payout,
        coverage: policy.coverage?.length ? policy.coverage : tierCfg.coverage,
        total_paid_out: policy.total_paid_out_db || policy.total_paid_out,
      },
    });

  } catch (err) {
    console.error("GET /api/policies error:", err);
    return Response.json({ policy: null, error: err.message }, { status: 500 });
  }
}

// POST /api/policies — create/replace policy (called during onboarding or upgrade)
export async function POST(request) {
  try {
    const body = await request.json();
    const { user_id, tier, premium } = body;

    if (!user_id || !tier || !premium) {
      return Response.json(
        { error: "user_id, tier, and premium are required" },
        { status: 400 }
      );
    }

    const tierCfg = TIER_CONFIG[tier];
    if (!tierCfg) {
      return Response.json(
        { error: `Invalid tier. Must be: ${Object.keys(TIER_CONFIG).join(", ")}` },
        { status: 400 }
      );
    }

    // Use transaction: deactivate old → create new → record first payment
    const policy = await withTransaction(async (txQuery) => {
      // 1. Deactivate any existing active policy
      await txQuery(`
        UPDATE policies SET active = false, updated_at = NOW()
        WHERE user_id = $1 AND active = true
      `, [user_id]);

      // 2. Create new policy
      const { rows } = await txQuery(`
        INSERT INTO policies
          (user_id, tier, premium, max_payout, coverage, active,
           activated_at, next_billing_date, total_paid_in)
        VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW() + INTERVAL '7 days', $3)
        RETURNING *
      `, [user_id, tier, parseInt(premium), tierCfg.max_payout, tierCfg.coverage]);

      const newPolicy = rows[0];

      // 3. Record first premium payment
      const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      await txQuery(`
        INSERT INTO premium_payments
          (payment_id, policy_id, worker_id, amount, status, upi_ref, billing_period)
        VALUES ($1, $2, $3, $4, 'success', $5, CURRENT_DATE)
        ON CONFLICT (payment_id) DO NOTHING
      `, [
        paymentId,
        newPolicy.id,
        user_id,
        parseInt(premium),
        `GS${Date.now().toString().slice(-10)}`,
      ]);

      return newPolicy;
    });

    return Response.json({
      success: true,
      policy: {
        ...policy,
        tier_name: tierCfg.name,
        coverage: tierCfg.coverage,
        max_payout: tierCfg.max_payout,
      },
    }, { status: 201 });

  } catch (err) {
    console.error("POST /api/policies error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/policies — upgrade/downgrade tier for authenticated user
export async function PATCH(request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tier, premium } = body;

    const tierCfg = TIER_CONFIG[tier];
    if (!tierCfg) {
      return Response.json({ error: "Valid tier required" }, { status: 400 });
    }

    const { rows } = await query(`
      UPDATE policies
      SET
        tier          = $1,
        premium       = $2,
        max_payout    = $3,
        coverage      = $4,
        updated_at    = NOW()
      WHERE user_id = $5 AND active = true
      RETURNING *
    `, [tier, parseInt(premium), tierCfg.max_payout, tierCfg.coverage, sessionUser.id]);

    if (rows.length === 0) {
      return Response.json({ error: "No active policy found" }, { status: 404 });
    }

    return Response.json({
      success: true,
      policy: { ...rows[0], tier_name: tierCfg.name, coverage: tierCfg.coverage },
    });

  } catch (err) {
    console.error("PATCH /api/policies error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
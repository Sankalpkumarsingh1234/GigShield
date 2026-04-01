import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/claims — fetch claims for a worker with stats
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get("worker_id") || "WRK-DEFAULT";
    const limit = parseInt(searchParams.get("limit") || "20");

    // Support both UUID worker IDs and legacy "WRK-DEFAULT"
    const { rows } = await query(`
      SELECT
        claim_id,
        trigger_type,
        trigger_value,
        city,
        pin_code,
        amount,
        status,
        upi_ref,
        TO_CHAR(created_at, 'Mon DD, YYYY') AS date,
        TO_CHAR(paid_at, 'Mon DD, YYYY HH24:MI') AS paid_time
      FROM claims
      WHERE worker_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [workerId, limit]);

    const total = rows.reduce((s, c) => s + (c.amount || 0), 0);
    const totalCount = rows.length;

    // Stats breakdown
    const byTrigger = {};
    rows.forEach(c => {
      byTrigger[c.trigger_type] = (byTrigger[c.trigger_type] || 0) + c.amount;
    });

    return Response.json({
      claims: rows,
      total,
      count: totalCount,
      byTrigger,
      meta: {
        workerId,
        avgPayout: totalCount > 0 ? Math.round(total / totalCount) : 0,
        lastPayout: rows[0]?.date || null,
      },
    });
  } catch (err) {
    console.error("Claims GET error:", err);
    // Return mock data as fallback
    return Response.json({
      claims: MOCK_CLAIMS,
      total: MOCK_CLAIMS.reduce((s, c) => s + c.amount, 0),
      count: MOCK_CLAIMS.length,
      _fallback: true,
    });
  }
}

// POST /api/claims — record a new auto-paid claim
export async function POST(request) {
  try {
    const body = await request.json();
    const { claim_id, worker_id, policy_id, trigger_type, trigger_value, city, pin_code, amount } = body;

    if (!claim_id || !worker_id || !trigger_type || !amount) {
      return Response.json({ error: "Missing required fields: claim_id, worker_id, trigger_type, amount" }, { status: 400 });
    }

    const upiRef = `GS${Date.now().toString().slice(-10)}`;

    const { rows } = await query(`
      INSERT INTO claims
        (claim_id, worker_id, policy_id, trigger_type, trigger_value, city, pin_code, amount, status, upi_ref, paid_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'paid', $9, NOW())
      ON CONFLICT (claim_id) DO NOTHING
      RETURNING *
    `, [claim_id, worker_id, policy_id || null, trigger_type, trigger_value, city || "Unknown", pin_code || null, amount, upiRef]);

    // Update policy total_paid_out if policy_id provided
    if (policy_id) {
      await query(`
        UPDATE policies SET total_paid_out = total_paid_out + $1, updated_at = NOW()
        WHERE id = $2
      `, [amount, policy_id]).catch(() => {});
    }

    return Response.json({ success: true, claim: rows[0], upi_ref: upiRef });
  } catch (err) {
    console.error("Claims POST error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

const MOCK_CLAIMS = [
  { claim_id: "CLM001", date: "Mar 12, 2025", trigger_type: "Heavy Rainfall",    city: "Chennai",   amount: 420, status: "paid" },
  { claim_id: "CLM002", date: "Feb 28, 2025", trigger_type: "Heat Stress",       city: "Hyderabad", amount: 310, status: "paid" },
  { claim_id: "CLM003", date: "Feb 10, 2025", trigger_type: "AQI Warning",       city: "Delhi",     amount: 190, status: "paid" },
  { claim_id: "CLM004", date: "Jan 22, 2025", trigger_type: "Platform Downtime", city: "Mumbai",    amount: 250, status: "paid" },
  { claim_id: "CLM005", date: "Jan 05, 2025", trigger_type: "Waterlogging",      city: "Chennai",   amount: 500, status: "paid" },
];
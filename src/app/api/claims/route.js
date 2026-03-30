import { query } from "@/lib/db";

// GET /api/claims?worker_id=xxx — fetch claims for a worker
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get("worker_id") || "WRK-DEFAULT";

    const { rows } = await query(
      `SELECT claim_id, trigger_type, trigger_value, city, amount, status,
              TO_CHAR(created_at, 'Mon DD, YYYY') AS date
       FROM claims
       WHERE worker_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [workerId]
    );

    const total = rows.reduce((s, c) => s + (c.amount || 0), 0);

    return Response.json({ claims: rows, total });
  } catch (err) {
    console.error("Claims GET error:", err);
    return Response.json({ claims: [], total: 0, error: err.message }, { status: 500 });
  }
}

// POST /api/claims — record a new auto-paid claim
export async function POST(request) {
  try {
    const body = await request.json();
    const { claim_id, worker_id, trigger_type, trigger_value, city, amount } = body;

    if (!claim_id || !worker_id || !trigger_type || !amount) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { rows } = await query(
      `INSERT INTO claims (claim_id, worker_id, trigger_type, trigger_value, city, amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'paid')
       ON CONFLICT (claim_id) DO NOTHING
       RETURNING *`,
      [claim_id, worker_id, trigger_type, trigger_value, city, amount]
    );

    return Response.json({ success: true, claim: rows[0] });
  } catch (err) {
    console.error("Claims POST error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
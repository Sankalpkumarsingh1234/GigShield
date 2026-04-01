import { query } from "@/lib/db";
import { FRAUD_CASES } from "@/data/mockData";

export const dynamic = "force-dynamic";

// GET /api/fraud-cases — fetch fraud cases for insurer review
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    const params = [];
    let whereClause = "";
    let paramIdx = 1;

    if (status) {
      whereClause = `WHERE status = $${paramIdx++}`;
      params.push(status);
    }
    params.push(limit);

    const { rows } = await query(`
      SELECT
        case_id,
        worker_name,
        worker_id,
        pin_code,
        trigger_type,
        fraud_score,
        signals,
        status,
        claim_amount,
        notes,
        reviewed_by,
        TO_CHAR(reviewed_at, 'Mon DD, YYYY HH24:MI') AS reviewed_at,
        TO_CHAR(created_at, 'Mon DD, YYYY') AS date
      FROM fraud_cases
      ${whereClause}
      ORDER BY fraud_score DESC, created_at DESC
      LIMIT $${paramIdx}
    `, params);

    // Parse JSONB signals if returned as string
    const cases = rows.map(c => ({
      ...c,
      signals: typeof c.signals === "string" ? JSON.parse(c.signals) : (c.signals || []),
    }));

    // Summary stats
    const { rows: summary } = await query(`
      SELECT
        COUNT(*)::INT AS total,
        COUNT(*) FILTER (WHERE status = 'pending')::INT AS pending,
        COUNT(*) FILTER (WHERE status = 'approved')::INT AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected')::INT AS rejected,
        COUNT(*) FILTER (WHERE fraud_score > 75)::INT AS high_risk,
        AVG(fraud_score)::INT AS avg_score,
        COALESCE(SUM(claim_amount) FILTER (WHERE status = 'approved'), 0)::INT AS approved_amount,
        COALESCE(SUM(claim_amount) FILTER (WHERE status = 'rejected'), 0)::INT AS blocked_amount
      FROM fraud_cases
    `);

    return Response.json({
      cases,
      summary: summary[0] || {},
    });
  } catch (err) {
    console.error("Fraud cases GET error:", err);
    // Fallback to mock
    return Response.json({
      cases: FRAUD_CASES.map(c => ({ ...c, status: "pending" })),
      summary: { total: 3, pending: 3, high_risk: 2, avg_score: 77 },
      _fallback: true,
    });
  }
}

// PATCH /api/fraud-cases — approve, reject, or escalate a fraud case
export async function PATCH(request) {
  try {
    const { case_id, status, reviewed_by, notes } = await request.json();

    if (!case_id || !["approved", "rejected", "pending", "escalated"].includes(status)) {
      return Response.json(
        { error: "case_id and valid status (approved/rejected/pending/escalated) required" },
        { status: 400 }
      );
    }

    const { rows } = await query(`
      UPDATE fraud_cases
      SET
        status = $1,
        reviewed_by = $2,
        reviewed_at = NOW(),
        notes = COALESCE($3, notes)
      WHERE case_id = $4
      RETURNING *
    `, [status, reviewed_by || "Insurer", notes || null, case_id]);

    if (rows.length === 0) {
      return Response.json({ error: "Case not found" }, { status: 404 });
    }

    const updatedCase = rows[0];

    // If rejected: block payout, log action
    // If approved: release payout, log action
    // In production: integrate with claims processing pipeline here

    return Response.json({
      success: true,
      case: {
        ...updatedCase,
        signals: typeof updatedCase.signals === "string"
          ? JSON.parse(updatedCase.signals)
          : updatedCase.signals,
      },
      message: status === "approved"
        ? `Case ${case_id} approved — payout released`
        : status === "rejected"
        ? `Case ${case_id} rejected — payout blocked`
        : `Case ${case_id} status updated to ${status}`,
    });
  } catch (err) {
    console.error("Fraud cases PATCH error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/fraud-cases — create a new fraud case (ML model output)
export async function POST(request) {
  try {
    const body = await request.json();
    const { case_id, worker_name, worker_id, pin_code, trigger_type, fraud_score, signals, claim_amount } = body;

    if (!case_id || !fraud_score) {
      return Response.json({ error: "case_id and fraud_score required" }, { status: 400 });
    }

    const { rows } = await query(`
      INSERT INTO fraud_cases
        (case_id, worker_name, worker_id, pin_code, trigger_type, fraud_score, signals, status, claim_amount)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
      ON CONFLICT (case_id) DO UPDATE SET
        fraud_score = EXCLUDED.fraud_score,
        signals = EXCLUDED.signals
      RETURNING *
    `, [case_id, worker_name, worker_id, pin_code, trigger_type, fraud_score, JSON.stringify(signals || []), claim_amount || 0]);

    return Response.json({ success: true, case: rows[0] }, { status: 201 });
  } catch (err) {
    console.error("Fraud cases POST error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
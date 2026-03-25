import { query } from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const params = [];
    let where = "";
    if (status) {
      params.push(status);
      where = `WHERE status = $1`;
    }

    const { rows } = await query(
      `SELECT case_id, worker_name, pin_code, trigger_type, fraud_score, signals, status,
              TO_CHAR(created_at, 'Mon DD, YYYY') AS date
       FROM fraud_cases
       ${where}
       ORDER BY fraud_score DESC`,
      params
    );

    return Response.json({ cases: rows });
  } catch (err) {
    console.error("Fraud cases fetch error:", err);
    return Response.json({ cases: [], error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { case_id, status } = await request.json();

    if (!case_id || !["approved", "rejected", "pending"].includes(status)) {
      return Response.json({ error: "case_id and valid status required" }, { status: 400 });
    }

    const { rows } = await query(
      `UPDATE fraud_cases SET status = $1 WHERE case_id = $2 RETURNING *`,
      [status, case_id]
    );

    if (rows.length === 0) {
      return Response.json({ error: "Case not found" }, { status: 404 });
    }

    return Response.json({ success: true, case: rows[0] });
  } catch (err) {
    console.error("Fraud case update error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

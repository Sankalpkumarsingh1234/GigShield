import { query } from "@/lib/db";

// GET /api/users/[id] — fetch worker profile, their policy and claims
export async function GET(_request, { params }) {
  try {
    const id = params?.id;
    if (!id) {
      return Response.json({ error: "user id required" }, { status: 400 });
    }

    const { rows: userRows } = await query(
      `SELECT id, name, platform, pin_code, earnings, nfi, created_at
       FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );

    // Return mock data gracefully if user not found
    if (!userRows.length) {
      return Response.json({
        mock: true,
        user: {
          id,
          name: "Demo Rider",
          platform: "Zomato",
          pin_code: "600001",
          earnings: 6000,
          nfi: 72,
        },
        policy: {
          id: crypto.randomUUID(),
          user_id: id,
          tier: "standard",
          premium: 54,
          max_payout: 1000,
          active: true,
        },
        claims: [],
      });
    }

    const { rows: policies } = await query(
      `SELECT * FROM policies WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [id]
    );

    const { rows: claims } = await query(
      `SELECT claim_id, trigger_type, trigger_value, city, amount, status,
              TO_CHAR(created_at, 'Mon DD, YYYY') AS date
       FROM claims WHERE worker_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [id]
    );

    return Response.json({
      user: userRows[0],
      policy: policies[0] || null,
      claims,
    });
  } catch (error) {
    console.error("GET /api/users/[id] failed:", error);
    return Response.json({ error: "Unable to fetch user profile" }, { status: 500 });
  }
}
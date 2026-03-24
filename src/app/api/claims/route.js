import { hasSupabaseConfig, insertOne } from "@/lib/superbaseServer";

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, trigger, amount, status = "paid" } = body || {};

    if (!userId || !trigger || !amount) {
      return Response.json(
        { error: "userId, trigger, and amount are required" },
        { status: 400 }
      );
    }

    if (!hasSupabaseConfig()) {
      return Response.json(
        {
          mock: true,
          claim: {
            id: crypto.randomUUID(),
            user_id: userId,
            trigger,
            amount: Number(amount),
            status,
            created_at: new Date().toISOString(),
          },
        },
        { status: 201 }
      );
    }

    const { data, error } = await insertOne(
      "claims",
      {
        user_id: userId,
        trigger,
        amount: Number(amount),
        status,
      },
      "id,user_id,trigger,amount,status,created_at"
    );

    if (error || !data) {
      throw error;
    }

    return Response.json({ claim: data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/claims failed:", error);
    return Response.json({ error: "Unable to create claim" }, { status: 500 });
  }
}

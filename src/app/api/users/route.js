import { hasSupabaseConfig, insertOne } from "@/lib/superbaseServer";

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, platform, pinCode, earnings, nfi, policy } = body || {};

    if (!name || !platform || !pinCode || !policy?.tier) {
      return Response.json(
        { error: "name, platform, pinCode, and policy.tier are required" },
        { status: 400 }
      );
    }

    if (!hasSupabaseConfig()) {
      return Response.json(
        {
          mock: true,
          user: {
            id: crypto.randomUUID(),
            name,
            platform,
            pin_code: pinCode,
            earnings: Number(earnings) || 0,
            nfi: Number(nfi) || 0,
          },
          policy: {
            id: crypto.randomUUID(),
            tier: policy.tier,
            premium: Number(policy.premium) || 0,
            max_payout: Number(policy.maxPayout) || 0,
            active: true,
          },
        },
        { status: 201 }
      );
    }

    const { data: createdUser, error: userError } = await insertOne(
      "users",
      {
        name,
        platform,
        pin_code: pinCode,
        earnings: Number(earnings) || 0,
        nfi: Number(nfi) || 0,
      },
      "id,name,platform,pin_code,earnings,nfi,created_at"
    );

    if (userError || !createdUser) {
      console.error("User insert failed:", userError);
      return Response.json(
        { error: userError?.message || JSON.stringify(userError) || "Unable to create user" },
        { status: 500 }
      );
    }

    const { data: createdPolicy, error: policyError } = await insertOne(
      "policies",
      {
        user_id: createdUser.id,
        tier: policy.tier,
        premium: Number(policy.premium) || 0,
        max_payout: Number(policy.maxPayout) || 0,
        active: true,
      },
      "id,user_id,tier,premium,max_payout,active,created_at"
    );

    if (policyError || !createdPolicy) {
      console.error("Policy insert failed:", policyError);
      return Response.json(
        { error: policyError?.message || JSON.stringify(policyError) || "Unable to create policy" },
        { status: 500 }
      );
    }

    return Response.json({ user: createdUser, policy: createdPolicy }, { status: 201 });
  } catch (error) {
    console.error("POST /api/users failed:", error);
    const errorMessage =
      error?.message || (typeof error === "string" ? error : JSON.stringify(error));
    return Response.json({ error: errorMessage || "Unable to create user" }, { status: 500 });
  }
}

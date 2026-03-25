import { getOne, hasSupabaseConfig, listMany } from "@/lib/superbaseServer";

export async function GET(_request, { params }) {
  try {
    const id = params?.id;

    if (!id) {
      return Response.json({ error: "user id required" }, { status: 400 });
    }

    if (!hasSupabaseConfig()) {
      return Response.json(
        {
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
            max_payout: 2500,
            active: true,
          },
          claims: [],
        },
        { status: 200 }
      );
    }

    const [{ data: user, error: userError }, { data: policies, error: policyError }, { data: claims, error: claimsError }] = await Promise.all([
      getOne("users", { id }, "id,name,platform,pin_code,earnings,nfi,created_at"),
      listMany("policies", {
        filters: { user_id: id },
        orderBy: "created_at",
        ascending: false,
        select: "id,user_id,tier,premium,max_payout,active,created_at",
      }),
      listMany("claims", {
        filters: { user_id: id },
        orderBy: "created_at",
        ascending: false,
        select: "id,user_id,trigger,amount,status,created_at",
      }),
    ]);

    if (userError) throw userError;
    if (policyError) throw policyError;
    if (claimsError) throw claimsError;

    return Response.json({ user, policy: policies?.[0] || null, claims: claims || [] });
  } catch (error) {
    console.error("GET /api/users/[id] failed:", error);
    return Response.json({ error: "Unable to fetch user profile" }, { status: 500 });
  }
}

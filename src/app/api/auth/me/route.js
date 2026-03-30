import { getSessionUser, normalizeUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return Response.json({ user: null }, { status: 200 });
    }

    return Response.json({ user: normalizeUser(user) });
  } catch (error) {
    console.error("GET /api/auth/me failed:", error);
    return Response.json({ user: null }, { status: 200 });
  }
}

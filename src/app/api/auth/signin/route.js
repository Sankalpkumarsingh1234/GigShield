import { createSessionResponse, ensureAuthSchema, isValidEmail, normalizeUser, normalizedEmail, verifyPassword } from "@/lib/auth-server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    await ensureAuthSchema();

    const body = await request.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required.", code: "missing_credentials" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return Response.json(
        { error: "Please enter a valid email address.", code: "invalid_email" },
        { status: 400 }
      );
    }

    const { rows } = await query(
      `SELECT id, email, password_hash, name, platform, phone, pin_code, earnings, nfi, created_at
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [normalizedEmail(email)]
    );

    const user = rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return Response.json(
        { error: "Incorrect email or password.", code: "invalid_credentials" },
        { status: 401 }
      );
    }

    const normalizedUser = normalizeUser(user);
    return createSessionResponse({ user: normalizedUser }, normalizedUser);
  } catch (error) {
    console.error("POST /api/auth/signin failed:", error);
    return Response.json({ error: "Unable to sign in." }, { status: 500 });
  }
}

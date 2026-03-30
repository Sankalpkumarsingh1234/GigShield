import { getSessionUser, isValidEmail, normalizeUser, normalizedEmail } from "@/lib/auth-server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return Response.json(
        { error: "You must be signed in.", code: "unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      platform,
      pinCode,
      earnings,
      nfi,
    } = body || {};

    if (!name || !email || !platform || !pinCode) {
      return Response.json(
        { error: "name, email, platform, and pinCode are required", code: "missing_fields" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return Response.json(
        { error: "Please enter a valid email address.", code: "invalid_email" },
        { status: 400 }
      );
    }

    const normalized = normalizedEmail(email);
    const existingUser = await query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1`,
      [normalized, sessionUser.id]
    );

    if (existingUser.rows.length) {
      return Response.json(
        { error: "Another account already uses this email.", code: "email_already_exists" },
        { status: 409 }
      );
    }

    const { rows } = await query(
      `UPDATE users
       SET name = $1,
           email = $2,
           phone = $3,
           platform = $4,
           pin_code = $5,
           earnings = $6,
           nfi = $7
       WHERE id = $8
       RETURNING id, email, name, platform, phone, pin_code, earnings, nfi, created_at`,
      [
        String(name).trim(),
        normalized,
        phone?.trim() || null,
        platform,
        pinCode,
        Number(earnings) || 0,
        Number(nfi) || 55,
        sessionUser.id,
      ]
    );

    return Response.json({ user: normalizeUser(rows[0]) });
  } catch (error) {
    console.error("PATCH /api/auth/profile failed:", error);
    return Response.json({ error: "Unable to update profile." }, { status: 500 });
  }
}

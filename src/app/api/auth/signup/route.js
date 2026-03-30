import { hashPassword, ensureAuthSchema, isValidEmail, createSessionResponse, normalizeUser, normalizedEmail } from "@/lib/auth-server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    await ensureAuthSchema();

    const body = await request.json();
    const {
      name,
      email,
      password,
      phone,
      platform,
      pinCode,
      earnings,
      nfi,
    } = body || {};

    if (!name || !email || !password || !platform || !pinCode) {
      return Response.json(
        { error: "name, email, password, platform, and pinCode are required" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return Response.json(
        { error: "Please enter a valid email address.", code: "invalid_email" },
        { status: 400 }
      );
    }

    if (String(password).length < 6) {
      return Response.json(
        { error: "Password must be at least 6 characters.", code: "weak_password" },
        { status: 400 }
      );
    }

    const normalized = normalizedEmail(email);
    const existingUser = await query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [normalized]
    );

    if (existingUser.rows.length) {
      return Response.json(
        { error: "An account with this email already exists.", code: "email_already_exists" },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, phone, platform, pin_code, earnings, nfi)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, name, platform, phone, pin_code, earnings, nfi, created_at`,
      [
        name.trim(),
        normalized,
        passwordHash,
        phone?.trim() || null,
        platform,
        pinCode,
        Number(earnings) || 0,
        Number(nfi) || 55,
      ]
    );

    const user = normalizeUser(rows[0]);
    return createSessionResponse({ user }, user);
  } catch (error) {
    console.error("POST /api/auth/signup failed:", error);
    return Response.json({ error: "Unable to create account." }, { status: 500 });
  }
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { query } from "@/lib/db";

const SESSION_COOKIE = "gigshield_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

let schemaReadyPromise;

function getAuthSecret() {
  if (process.env.AUTH_SECRET) {
    return process.env.AUTH_SECRET;
  }

  if (process.env.NODE_ENV !== "production") {
    return "gigshield-dev-secret-change-me";
  }

  throw new Error("AUTH_SECRET is required in production.");
}

function sanitizeEmail(email = "") {
  return email
    .normalize("NFKC")
    .replace(/\p{Cf}/gu, "")
    .replace(/\s+/gu, "")
    .toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizeEmail(email));
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [salt, key] = (storedHash || "").split(":");
  if (!salt || !key) {
    return false;
  }

  const derivedKey = scryptSync(password, salt, 64);
  const storedKey = Buffer.from(key, "hex");

  if (derivedKey.length !== storedKey.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, storedKey);
}

function signSessionPayload(payload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getAuthSecret())
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  const expectedSignature = createHmac("sha256", getAuthSecret())
    .update(encodedPayload)
    .digest("base64url");

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (!payload?.userId || !payload?.exp || Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function ensureAuthSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100),
          platform VARCHAR(20),
          pin_code VARCHAR(10),
          earnings INT,
          nfi INT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)`);
      await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
      await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30)`);
      await query(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (LOWER(email))`);
    })();
  }

  return schemaReadyPromise;
}

export function createSessionResponse(body, user) {
  const payload = {
    userId: user.id,
    email: user.email,
    exp: Date.now() + SESSION_TTL_MS,
  };

  const response = NextResponse.json(body);
  response.cookies.set({
    name: SESSION_COOKIE,
    value: signSessionPayload(payload),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });

  return response;
}

export function clearSessionResponse(body = { success: true }) {
  const response = NextResponse.json(body);
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function getSessionUser() {
  await ensureAuthSchema();

  const token = cookies().get(SESSION_COOKIE)?.value;
  const payload = verifySessionToken(token);
  if (!payload) {
    return null;
  }

  const { rows } = await query(
    `SELECT id, email, name, platform, phone, pin_code, earnings, nfi, created_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [payload.userId]
  );

  return rows[0] || null;
}

export function normalizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    platform: user.platform,
    phone: user.phone || "",
    pinCode: user.pin_code || "",
    earnings: user.earnings ?? 0,
    nfi: user.nfi ?? 55,
    createdAt: user.created_at,
  };
}

export function normalizedEmail(email) {
  return sanitizeEmail(email);
}

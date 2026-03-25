// src/lib/supabase.js
// Supabase client + auth helpers
// IMPORTANT: run `npm install @supabase/supabase-js @supabase/ssr` first

let _supabase = null;

function getClient() {
  if (_supabase) return _supabase;
  try {
    // Dynamic require prevents crash when package is not yet installed
    const { createClient } = require("@supabase/supabase-js");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      console.warn("[GigShield] Supabase env vars not set — auth is in mock mode.");
      return null;
    }
    _supabase = createClient(url, key);
    return _supabase;
  } catch {
    console.warn("[GigShield] @supabase/supabase-js not installed. Run: npm install @supabase/supabase-js @supabase/ssr");
    return null;
  }
}

// Lazy proxy — imports never crash even when package/env vars are missing
export const supabase = new Proxy(
  {},
  {
    get(_, prop) {
      const client = getClient();
      if (!client) {
        // Stub: return a function that returns a resolved promise with an error
        if (prop === "auth") {
          const stub = () => Promise.resolve({ data: null, error: new Error("Supabase not configured") });
          return { signUp: stub, signInWithPassword: stub, signOut: stub, getSession: stub, getUser: stub, onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) };
        }
        return () => Promise.resolve({ data: null, error: new Error("Supabase not configured") });
      }
      const val = client[prop];
      return typeof val === "function" ? val.bind(client) : val;
    },
  }
);

// ── Auth helpers ──────────────────────────────────────────────────────────────

export async function signUpWithEmail({ email, password, name, platform, phone }) {
  const client = getClient();
  if (!client) return { data: null, error: new Error("Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then run: npm install @supabase/supabase-js @supabase/ssr") };
  return client.auth.signUp({
    email,
    password,
    options: { data: { name, platform, phone } },
  });
}

export async function signInWithEmail({ email, password }) {
  const client = getClient();
  if (!client) return { data: null, error: new Error("Supabase not configured.") };
  return client.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  const client = getClient();
  if (!client) return { error: null };
  return client.auth.signOut();
}

export async function getSession() {
  const client = getClient();
  if (!client) return { session: null, error: null };
  const { data: { session }, error } = await client.auth.getSession();
  return { session, error };
}

export async function getUser() {
  const client = getClient();
  if (!client) return { user: null, error: null };
  const { data: { user }, error } = await client.auth.getUser();
  return { user, error };
}

// ── Profile helpers ───────────────────────────────────────────────────────────

export async function createUserProfile({ userId, name, platform, phone, pinCode, earnings, nfi }) {
  const client = getClient();
  if (!client) return { data: null, error: null };
  return client
    .from("user_profiles")
    .insert({
      user_id: userId,
      name,
      platform,
      phone,
      pin_code: pinCode,
      earnings: earnings ? Number(earnings) : null,
      nfi: nfi ? Number(nfi) : null,
    })
    .select()
    .single();
}

export async function getUserProfile(userId) {
  const client = getClient();
  if (!client) return { data: null, error: null };
  return client.from("user_profiles").select("*").eq("user_id", userId).single();
}
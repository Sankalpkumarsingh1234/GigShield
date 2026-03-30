import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let browserClient;

function sanitizeEmail(email = "") {
  return email
    .normalize("NFKC")
    .replace(/\p{Cf}/gu, "")
    .replace(/\s+/gu, "")
    .toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createConfigError() {
  return {
    message:
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable authentication.",
  };
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}

export const supabase = getSupabaseClient();

export async function signUpWithEmail({ email, password, name, platform, phone }) {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: createConfigError() };
  }

  const normalizedEmail = sanitizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    return {
      data: null,
      error: { message: "Please enter a valid email address." },
    };
  }

  return client.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        name,
        platform,
        phone,
      },
    },
  });
}

export async function signInWithEmail({ email, password }) {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: createConfigError() };
  }

  const normalizedEmail = sanitizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    return {
      data: null,
      error: { message: "Please enter a valid email address." },
    };
  }

  return client.auth.signInWithPassword({ email: normalizedEmail, password });
}

export async function createUserProfile({
  userId,
  name,
  platform,
  phone,
  pinCode,
  earnings,
  nfi,
}) {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: createConfigError() };
  }

  return client.from("user_profiles").upsert(
    {
      user_id: userId,
      name,
      platform,
      phone: phone || null,
      pin_code: pinCode,
      earnings: Number(earnings),
      nfi,
    },
    { onConflict: "user_id" }
  );
}

export async function signOut() {
  const client = getSupabaseClient();
  if (!client) {
    return { error: null };
  }

  return client.auth.signOut();
}

export async function signIn(credentials) {
  return signInWithEmail(credentials);
}

// src/lib/superbase.js
// Supabase client + auth helpers
import { createClient } from "@supabase/supabase-js";

let _supabase = null;

function getEnvConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  console.log("SUPABASE URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("ANON KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 10));

  if (!url || !anonKey) {
    return { url: null, anonKey: null };
  }

  return { url, anonKey };
}

function createStubClient(message) {
  const authError = new Error(message);
  const authStub = async () => ({ data: null, error: authError });

  return {
    auth: {
      signUp: authStub,
      signInWithPassword: authStub,
      signOut: async () => ({ error: null }),
      getSession: async () => ({ data: { session: null }, error: authError }),
      getUser: async () => ({ data: { user: null }, error: authError }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from() {
      return {
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: authError }),
          }),
        }),
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: authError }),
          }),
        }),
      };
    },
  };
}

function getClient() {
  if (_supabase) return _supabase;

  const { url, anonKey } = getEnvConfig();
  if (!url || !anonKey) {
    _supabase = createStubClient(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local and restart the dev server."
    );
    

    return _supabase;
  }

  _supabase = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return _supabase;
}

function translateAuthError(error) {
  const message = error?.message || "";

  if (!message) {
    return "Authentication failed. Please try again.";
  }

  if (/invalid api key/i.test(message)) {
    return "Supabase rejected the public API key. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the app.";
  }

  if (/invalid login credentials/i.test(message)) {
    return "Invalid email or password. Double-check your credentials and try again.";
  }

  if (/email rate limit exceeded/i.test(message)) {
    return "Too many email attempts. Please wait a few minutes and try again.";
  }

  return message;
}

export const supabase = getClient();

export async function signUpWithEmail({ email, password, name, platform, phone }) {
  console.log("signUpWithEmail payload", {
    email,
    emailLength: email?.length,
    emailJson: JSON.stringify(email),
    passwordLength: password?.length,
    name,
    platform,
    phone,
  });

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, platform, phone } },
  });

  if (error) {
    console.error("Supabase signUp response error:", error);
  }

  return {
    data,
    error: error ? new Error(translateAuthError(error)) : null,
  };
}

export async function signInWithEmail({ email, password }) {
  console.log("signInWithEmail payload", {
    email,
    passwordLength: password?.length,
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("Supabase signIn response error:", error);
  }

  return {
    data,
    error: error ? new Error(translateAuthError(error)) : null,
  };
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  return { session: data?.session ?? null, error };
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  return { user: data?.user ?? null, error };
}

export async function createUserProfile({ userId, name, platform, phone, pinCode, earnings, nfi }) {
  return supabase
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
  return supabase.from("user_profiles").select("*").eq("user_id", userId).single();
}

export { translateAuthError };

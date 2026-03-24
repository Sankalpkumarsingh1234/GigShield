function getConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return { supabaseUrl, serviceRoleKey };
}

async function request(path, { method = "GET", body, select } = {}) {
  const cfg = getConfig();
  if (!cfg) return { data: null, error: new Error("Supabase config missing") };

  const url = new URL(`${cfg.supabaseUrl}/rest/v1/${path}`);
  if (select) {
    url.searchParams.set("select", select);
  }

  const headers = {
    apikey: cfg.serviceRoleKey,
    Authorization: `Bearer ${cfg.serviceRoleKey}`,
    "Content-Type": "application/json",
  };

  if (method === "POST") {
    headers.Prefer = "return=representation";
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;

  if (!res.ok) {
    return { data: null, error: payload || new Error(`HTTP ${res.status}`) };
  }

  return { data: payload, error: null };
}

export function hasSupabaseConfig() {
  return Boolean(getConfig());
}

export async function insertOne(table, row, select = "*") {
  const { data, error } = await request(table, {
    method: "POST",
    body: row,
    select,
  });

  return { data: Array.isArray(data) ? data[0] : data, error };
}

export async function getOne(table, filters = {}, select = "*") {
  const cfg = getConfig();
  if (!cfg) return { data: null, error: new Error("Supabase config missing") };

  const url = new URL(`${cfg.supabaseUrl}/rest/v1/${table}`);
  url.searchParams.set("select", select);
  Object.entries(filters).forEach(([key, value]) => {
    url.searchParams.set(key, `eq.${value}`);
  });
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    headers: {
      apikey: cfg.serviceRoleKey,
      Authorization: `Bearer ${cfg.serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;

  if (!res.ok) {
    return { data: null, error: payload || new Error(`HTTP ${res.status}`) };
  }

  return { data: Array.isArray(payload) ? payload[0] || null : payload, error: null };
}

export async function listMany(table, { filters = {}, orderBy = "created_at", ascending = false, select = "*" } = {}) {
  const cfg = getConfig();
  if (!cfg) return { data: null, error: new Error("Supabase config missing") };

  const url = new URL(`${cfg.supabaseUrl}/rest/v1/${table}`);
  url.searchParams.set("select", select);
  Object.entries(filters).forEach(([key, value]) => {
    url.searchParams.set(key, `eq.${value}`);
  });
  url.searchParams.set("order", `${orderBy}.${ascending ? "asc" : "desc"}`);

  const res = await fetch(url.toString(), {
    headers: {
      apikey: cfg.serviceRoleKey,
      Authorization: `Bearer ${cfg.serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;

  if (!res.ok) {
    return { data: null, error: payload || new Error(`HTTP ${res.status}`) };
  }

  return { data: Array.isArray(payload) ? payload : [], error: null };
}

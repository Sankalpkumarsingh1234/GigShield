import { supabaseAdmin, hasSupabaseConfig } from "@/lib/supabaseAdmin";
import { query } from "@/lib/db";

export async function POST(request) {
  try {
    const { name, email, password, phone, role = 'worker' } = await request.json();

    if (!name || !email || !password) {
      return Response.json({ error: 'name, email and password are required' }, { status: 400 });
    }

    // Fallback: no Supabase, use DB-only mock
    if (!hasSupabaseConfig()) {
      const mockUser = {
        id: `mock_${Date.now()}`,
        name, email, phone, role,
        created_at: new Date().toISOString(),
      };
      return Response.json({ user: mockUser, session: { access_token: `mock_token_${Date.now()}` }, mock: true }, { status: 201 });
    }

    // Create auth user in Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone, role },
    });

    if (authError) {
      return Response.json({ error: authError.message }, { status: 400 });
    }

    // Also store in local DB
    try {
      await query(
        `INSERT INTO workers (worker_id, name, platform, pin_code, active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (worker_id) DO NOTHING`,
        [authData.user.id, name, 'Zomato', '000000']
      );
    } catch (_) { /* non-fatal */ }

    return Response.json({ user: authData.user }, { status: 201 });
  } catch (err) {
    console.error('Register error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
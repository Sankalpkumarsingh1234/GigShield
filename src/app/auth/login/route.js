import { supabaseAdmin, hasSupabaseConfig } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json({ error: 'email and password are required' }, { status: 400 });
    }

    if (!hasSupabaseConfig()) {
      const mockUser = { id: `mock_${Date.now()}`, email, name: 'Demo User' };
      return Response.json({
        user: mockUser,
        session: { access_token: `mock_token_${Date.now()}` },
        mock: true,
      });
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (error) {
      return Response.json({ error: error.message }, { status: 401 });
    }

    return Response.json({ user: data.user, session: data.session });
  } catch (err) {
    console.error('Login error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
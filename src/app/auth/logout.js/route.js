import { supabaseAdmin, hasSupabaseConfig } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (token && hasSupabaseConfig()) {
      await supabaseAdmin.auth.admin.signOut(token);
    }
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ success: true }); // Always succeed logout
  }
}
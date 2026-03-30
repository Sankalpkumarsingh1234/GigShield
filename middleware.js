import { NextResponse } from "next/server";

// Auth middleware — currently a no-op (Supabase auth not configured).
// To enable auth later: add NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
// and install @supabase/ssr.
export async function middleware(request) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
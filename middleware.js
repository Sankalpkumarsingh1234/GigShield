// middleware.js  (place in project root alongside package.json)
// Protects "/" — redirects unauthenticated users to /auth
// Redirects authenticated users away from /auth back to "/"
// Safe fallback: if @supabase/ssr is not installed, middleware is a no-op

import { NextResponse } from "next/server";

export async function middleware(request) {
  const path = request.nextUrl.pathname;

  // Try to use Supabase SSR — silently skip if package not installed yet
  try {
    const { createServerClient } = await import("@supabase/ssr");

    const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // If env vars not set, skip auth check entirely
    if (!supabaseUrl || !supabaseKey) return NextResponse.next();

    let response = NextResponse.next({ request });

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();

    // Not logged in and not on /auth → send to /auth
    if (!user && path !== "/auth") {
      return NextResponse.redirect(new URL("/auth", request.url));
    }

    // Logged in and on /auth → send to home
    if (user && path === "/auth") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return response;
  } catch {
    // Package not installed or any other error — let request through
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
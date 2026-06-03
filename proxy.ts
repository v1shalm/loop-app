import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next 16 Proxy (formerly middleware.ts).
 * Refreshes the Supabase auth cookie on every request and gates the (app)
 * routes behind authentication.
 *
 * When Supabase env vars are missing, the proxy is a no-op so the app keeps
 * working with mock data during local setup.
 */
export async function proxy(request: NextRequest) {
  // Supabase renamed `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  // in early 2026. Accept either, prefer the new name.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/auth");
  const isPublicAsset = path.startsWith("/_next") || path.startsWith("/api");
  // /process is the case-study landing, /flows is the system map — both
  // public to anyone hitting the URL (no app data, just docs).
  const isPublicMarketing =
    path === "/process" ||
    path.startsWith("/process/") ||
    path === "/flows";

  if (!user && !isAuthRoute && !isPublicAsset && !isPublicMarketing) {
    const next = new URL("/login", request.url);
    next.searchParams.set("next", path);
    return NextResponse.redirect(next);
  }
  if (user && path === "/login") {
    return NextResponse.redirect(new URL("/assigned-to-me", request.url));
  }
  // Unauthenticated hits to "/" → case study (reviewer's first view).
  // Authenticated hits to "/" → into the app.
  if (!user && path === "/") {
    return NextResponse.redirect(new URL("/process", request.url));
  }
  if (user && path === "/") {
    return NextResponse.redirect(new URL("/assigned-to-me", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};

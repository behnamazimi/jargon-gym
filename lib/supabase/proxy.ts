import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requestPathWithSearch, safeNextPath } from "@/lib/auth/safe-next-path";
import type { Database } from "@/lib/supabase/database.types";

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/icon" ||
    pathname.startsWith("/icon/") ||
    pathname === "/apple-icon" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/~offline" ||
    pathname.startsWith("/screenshots/") ||
    pathname === "/install-widget.sh" ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    pathname === "/j" ||
    pathname.startsWith("/j/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/request-access") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/before-you-sign-up") ||
    pathname.startsWith("/how-terms-work") ||
    pathname.startsWith("/how-smart-queue-works") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/downloads/") ||
    pathname.startsWith("/api/widget") ||
    // Bearer-secret auth in route handlers (Edge → Next Telegram proxy)
    pathname.startsWith("/api/internal/telegram")
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and supabase.auth.getUser().
  // A simple mistake can make users appear randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (request.nextUrl.searchParams.has("code") && !pathname.startsWith("/auth/callback")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    const next = requestPathWithSearch(pathname, request.nextUrl.search);
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("referral_verified")
      .eq("id", user.id)
      .maybeSingle();

    const referralVerified = profile?.referral_verified ?? false;

    if (
      !referralVerified &&
      !pathname.startsWith("/complete-signup") &&
      !pathname.startsWith("/request-access")
    ) {
      const url = request.nextUrl.clone();
      const next = requestPathWithSearch(pathname, request.nextUrl.search);
      url.pathname = "/complete-signup";
      url.search = "";
      url.searchParams.set("next", next);
      return NextResponse.redirect(url);
    }

    if (referralVerified && pathname.startsWith("/complete-signup")) {
      const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"));
      return NextResponse.redirect(new URL(nextPath, request.url));
    }

    if (pathname.startsWith("/login") || pathname.startsWith("/signup")) {
      const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"));
      return NextResponse.redirect(new URL(nextPath, request.url));
    }
  }

  return supabaseResponse;
}

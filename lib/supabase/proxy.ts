import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requestPathWithSearch, safeNextPath } from "@/lib/auth/safe-next-path";
import type { Database } from "@/lib/supabase/database.types";

// referral_verified only ever flips false -> true (during onboarding), so once
// we've confirmed it we can skip the DB round-trip on every subsequent
// navigation and trust this cookie instead. This removes a query from the
// proxy's critical path for essentially every request from an onboarded user.
export const REFERRAL_VERIFIED_COOKIE = "jg_rv";
const REFERRAL_VERIFIED_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

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
    const cachedReferralVerified = request.cookies.get(REFERRAL_VERIFIED_COOKIE)?.value === "1";

    let referralVerified = cachedReferralVerified;
    if (!cachedReferralVerified) {
      const { data: profile } = await supabase
        .from("users")
        .select("referral_verified")
        .eq("id", user.id)
        .maybeSingle();

      referralVerified = profile?.referral_verified ?? false;

      if (referralVerified) {
        supabaseResponse.cookies.set(REFERRAL_VERIFIED_COOKIE, "1", {
          maxAge: REFERRAL_VERIFIED_COOKIE_MAX_AGE,
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }
    }

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

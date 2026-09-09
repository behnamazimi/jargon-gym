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

const PUBLIC_EXACT_PATHS = new Set([
  "/",
  "/icon",
  "/apple-icon",
  "/manifest.webmanifest",
  "/~offline",
  "/install-widget.sh",
  "/sitemap.xml",
  "/robots.txt",
  "/j",
]);

const PUBLIC_PATH_PREFIXES = [
  "/icon/",
  "/screenshots/",
  "/j/",
  "/login",
  "/signup",
  "/request-access",
  "/forgot-password",
  "/reset-password",
  "/before-you-sign-up",
  "/how-terms-work",
  "/auth/callback",
  "/downloads/",
  "/api/widget",
  // Bearer-secret auth in route handlers (Edge → Next Telegram proxy)
  "/api/internal/telegram",
];

function isPublicPath(pathname: string) {
  return (
    PUBLIC_EXACT_PATHS.has(pathname) || PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p))
  );
}

function redirectToPathWithNext(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  const next = requestPathWithSearch(request.nextUrl.pathname, request.nextUrl.search);
  url.pathname = pathname;
  url.search = "";
  url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

function redirectToNextParam(request: NextRequest) {
  const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"));
  return NextResponse.redirect(new URL(nextPath, request.url));
}

function redirectForAuthCode(request: NextRequest, pathname: string) {
  if (!request.nextUrl.searchParams.has("code") || pathname.startsWith("/auth/callback")) {
    return null;
  }
  const url = request.nextUrl.clone();
  url.pathname = "/auth/callback";
  return NextResponse.redirect(url);
}

async function resolveReferralVerified(
  supabase: ReturnType<typeof createServerClient<Database>>,
  request: NextRequest,
  supabaseResponse: NextResponse,
  userId: string,
) {
  const cachedReferralVerified = request.cookies.get(REFERRAL_VERIFIED_COOKIE)?.value === "1";
  if (cachedReferralVerified) return true;

  const { data: profile } = await supabase
    .from("users")
    .select("referral_verified")
    .eq("id", userId)
    .maybeSingle();
  const referralVerified = profile?.referral_verified ?? false;

  if (referralVerified) {
    supabaseResponse.cookies.set(REFERRAL_VERIFIED_COOKIE, "1", {
      maxAge: REFERRAL_VERIFIED_COOKIE_MAX_AGE,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return referralVerified;
}

function redirectForSignedInUser(
  request: NextRequest,
  pathname: string,
  referralVerified: boolean,
) {
  const onReferralExemptPath =
    pathname.startsWith("/complete-signup") || pathname.startsWith("/request-access");
  if (!referralVerified && !onReferralExemptPath) {
    return redirectToPathWithNext(request, "/complete-signup");
  }

  if (referralVerified && pathname.startsWith("/complete-signup")) {
    return redirectToNextParam(request);
  }

  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) {
    return redirectToNextParam(request);
  }

  return null;
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

  const authCodeRedirect = redirectForAuthCode(request, pathname);
  if (authCodeRedirect) return authCodeRedirect;

  if (!user) {
    return isPublicPath(pathname) ? supabaseResponse : redirectToPathWithNext(request, "/login");
  }

  const referralVerified = await resolveReferralVerified(
    supabase,
    request,
    supabaseResponse,
    user.id,
  );
  const signedInRedirect = redirectForSignedInUser(request, pathname, referralVerified);
  if (signedInRedirect) return signedInRedirect;

  return supabaseResponse;
}

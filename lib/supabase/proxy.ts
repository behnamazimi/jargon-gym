import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requestPathWithSearch, safeNextPath } from "@/lib/auth/safe-next-path";
import { setVerifiedUser, VERIFIED_USER_HEADERS } from "@/lib/auth/verified-user-header";
import { isUuid } from "@/lib/admin/list-params";
import type { Database } from "@/lib/supabase/database.types";
import { READ_LANDING_COOKIE, readLandingRedirect } from "@/lib/read/landing";

// referral_verified only ever flips false -> true (during onboarding), so once
// we've confirmed it we can skip the DB round-trip on every subsequent
// navigation and trust this cookie instead. This removes a query from the
// proxy's critical path for essentially every request from an onboarded user.
export const REFERRAL_VERIFIED_COOKIE = "lb_rv";
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
  "/collections",
  "/opengraph-image",
]);

const PUBLIC_PATH_PREFIXES = [
  "/icon/",
  "/splash/",
  "/screenshots/",
  "/collections/",
  "/c/",
  "/login",
  "/signup",
  "/request-access",
  "/forgot-password",
  "/reset-password",
  "/before-you-sign-up",
  "/how-terms-work",
  "/about",
  "/features",
  "/privacy",
  "/terms",
  "/contact",
  "/auth/callback",
  "/downloads/",
  "/api/widget",
  // Bearer-secret auth in route handlers (Edge → Next Telegram proxy, narration sync)
  "/api/internal/telegram",
  "/api/internal/narration",
  "/api/internal/ai-health",
];

// Signed-out visitors are sent to login only from these. Any other unknown
// path falls through to the 404 page instead of a misleading login screen.
const PRIVATE_PATH_PREFIXES = ["/app", "/admin", "/complete-signup", "/api"];

function isPrivatePath(pathname: string) {
  return PRIVATE_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

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

const SHARED_LINK_PATH = /^\/c\/([^/]+)$/;

function withCookiesFrom(source: NextResponse, response: NextResponse) {
  source.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}

/** A shared link that stopped working gets a real 404, and a built-in's link a
 *  real redirect to its public page. Checked here because the page streams,
 *  and a streamed page can no longer change its status. */
async function sharedLinkResponse(
  supabase: ReturnType<typeof createServerClient<Database>>,
  request: NextRequest,
  pathname: string,
  supabaseResponse: NextResponse,
) {
  const collectionId = SHARED_LINK_PATH.exec(pathname)?.[1];
  if (!collectionId) return null;

  // An unmatched path under the same prefix, so the 404 page gets the same chrome.
  const notFound = () =>
    withCookiesFrom(
      supabaseResponse,
      NextResponse.rewrite(new URL(`${pathname}/not-found`, request.url), { status: 404 }),
    );
  if (!isUuid(collectionId)) return notFound();

  const { data, error } = await supabase.rpc("shared_collection_link", {
    p_collection_id: collectionId,
  });
  // The page checks again, so a failed lookup just lets it through.
  if (error) return null;
  if (!data) return notFound();

  const publicSlug = (data as { public_slug: string | null }).public_slug;
  if (!publicSlug) return null;
  return withCookiesFrom(
    supabaseResponse,
    NextResponse.redirect(new URL(`/collections/${publicSlug}`, request.url), 308),
  );
}

export async function updateSession(request: NextRequest) {
  // Drop any client-sent copies before anything forwards this request.
  for (const name of VERIFIED_USER_HEADERS) request.headers.delete(name);

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

  // Do not run code between createServerClient and supabase.auth.getClaims().
  // A simple mistake can make users appear randomly logged out.
  // getClaims checks the token's signature here instead of asking Supabase
  // Auth on every request. A suspension therefore bites when the token next
  // refreshes (within the hour), not on the very next request.
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const user = claims?.sub ? { id: claims.sub, email: claims.email ?? null } : null;

  const { pathname } = request.nextUrl;

  const authCodeRedirect = redirectForAuthCode(request, pathname);
  if (authCodeRedirect) return authCodeRedirect;

  const sharedLink = await sharedLinkResponse(supabase, request, pathname, supabaseResponse);
  if (sharedLink) return sharedLink;

  if (!user) {
    return isPublicPath(pathname) || !isPrivatePath(pathname)
      ? supabaseResponse
      : redirectToPathWithNext(request, "/login");
  }

  const referralVerified = await resolveReferralVerified(
    supabase,
    request,
    supabaseResponse,
    user.id,
  );
  const signedInRedirect = redirectForSignedInUser(request, pathname, referralVerified);
  if (signedInRedirect) return signedInRedirect;

  const readLanding = readLandingRedirect(
    pathname,
    request.nextUrl.searchParams,
    request.cookies.get(READ_LANDING_COOKIE)?.value,
  );
  if (readLanding) {
    const redirect = NextResponse.redirect(new URL(readLanding, request.url));
    supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  // Forward the already-verified user so pages, actions and route handlers
  // behind this proxy don't need to call supabase.auth.getClaims() again.
  const requestHeaders = new Headers(request.headers);
  await setVerifiedUser(requestHeaders, { id: user.id, email: user.email });
  const responseWithHeader = NextResponse.next({ request: { headers: requestHeaders } });
  // NextResponse.next() returns a fresh response object, which would drop
  // any cookies already queued on supabaseResponse (session refresh,
  // referral_verified) — carry them over instead of losing them.
  supabaseResponse.cookies.getAll().forEach((cookie) => responseWithHeader.cookies.set(cookie));
  supabaseResponse = responseWithHeader;

  return supabaseResponse;
}

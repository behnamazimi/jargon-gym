import { type NextRequest, NextResponse } from "next/server";
import { legacyHostRedirect } from "@/lib/legacy-host";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const redirectTo = legacyHostRedirect({
    host: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    method: request.method,
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    target: process.env.LEGACY_HOST_REDIRECT_TO,
  });
  if (redirectTo) return NextResponse.redirect(redirectTo, 307);
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - web app manifest (browsers fetch this without a session)
     * - Serwist service worker
     * - PWA screenshots
     *
     * Excluded by folder only, never by file extension: a dynamic page can be
     * reached at a path ending in ".png", and it must still pass the proxy.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|serwist/|screenshots/).*)",
  ],
};

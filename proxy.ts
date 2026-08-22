import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
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
     * - image assets
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|serwist/|screenshots/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

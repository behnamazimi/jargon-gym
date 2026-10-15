import { normalizeReferralCode } from "@/lib/auth/referral-code";
import { safeNextPath } from "@/lib/auth/safe-next-path";

/** Where Supabase sends the system browser once Google sign-in is done; the app opens from it. */
export const NATIVE_AUTH_REDIRECT = "com.lobyas.app://auth/callback";

const CALLBACK_PATH = "/auth/callback";
const PASSED_THROUGH = ["code", "error_code", "flow"] as const;

/**
 * Turns the link that reopened the app into the WebView's own `/auth/callback` path, which
 * exchanges the code with the sign-in cookie the WebView already holds. Anything that isn't
 * the exact callback link returns null.
 */
export function parseAuthDeepLink(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  const expected = new URL(NATIVE_AUTH_REDIRECT);
  if (url.protocol !== expected.protocol || url.host !== expected.host) return null;
  if (url.pathname !== expected.pathname) return null;

  const params = new URLSearchParams();
  for (const key of PASSED_THROUGH) {
    const value = url.searchParams.get(key);
    if (value) params.set(key, value);
  }
  params.set("next", safeNextPath(url.searchParams.get("next")));
  const ref = normalizeReferralCode(url.searchParams.get("ref"));
  if (ref) params.set("ref", ref);

  return `${CALLBACK_PATH}?${params.toString()}`;
}

const LEGACY_HOST = "jargon-gym.vercel.app";
const SERVED_ON_LEGACY_HOST = ["/api/", "/downloads/", "/auth/", "/install-widget.sh"];

/** Where a page request on the old host should go, or null to answer it here. The target comes
 *  from LEGACY_HOST_REDIRECT_TO and stays off until the new domain is attached. The API, downloads
 *  and auth paths keep answering on the old host: installed widgets post there and can't follow a
 *  redirect, and emailed sign-in links point there. */
export function legacyHostRedirect({
  host,
  method,
  pathname,
  search,
  target,
}: {
  host: string | null;
  method: string;
  pathname: string;
  search: string;
  target: string | undefined;
}): string | null {
  if (!target || host?.split(":")[0] !== LEGACY_HOST) return null;
  if (method !== "GET" && method !== "HEAD") return null;
  if (SERVED_ON_LEGACY_HOST.some((path) => pathname.startsWith(path))) return null;
  return new URL(`${pathname}${search}`, target).toString();
}

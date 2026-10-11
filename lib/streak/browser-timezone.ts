import { cookies } from "next/headers";
import { isKnownTimeZone } from "@/lib/trace/local-day";

const BROWSER_TIMEZONE_COOKIE = "lb_tz";

/** Runs in the page before React loads, so the cookie is there for the first study action. */
export const BROWSER_TIMEZONE_SCRIPT = `try{document.cookie="${BROWSER_TIMEZONE_COOKIE}="+encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)+";path=/;max-age=31536000;samesite=lax"}catch(e){}`;

/** The timezone the browser reported, or null when it's missing or unknown. */
export async function readBrowserTimezone(): Promise<string | null> {
  const raw = (await cookies()).get(BROWSER_TIMEZONE_COOKIE)?.value;
  if (!raw) return null;
  const value = decodeURIComponent(raw);
  return isKnownTimeZone(value) ? value : null;
}

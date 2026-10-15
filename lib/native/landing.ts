import { AUTHENTICATED_HOME_PATH } from "@/lib/auth/safe-next-path";
import { parseShell } from "./shell";

/** The app skips the marketing page: members open the study area and everyone
 *  else opens login. Other public pages stay reachable by link. */
export function nativeLandingPath(
  pathname: string,
  userAgent: string | null,
  signedIn: boolean,
): string | null {
  if (pathname !== "/" || !parseShell(userAgent ?? "").native) return null;
  return signedIn ? AUTHENTICATED_HOME_PATH : "/login";
}

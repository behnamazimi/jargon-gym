const AUTH_COOKIE = /(?:^|;\s*)[^=;]*-auth-token(?:\.\d+)?=/;

/** The auth cookie is readable in the browser, which is enough to tell a signed-in user apart without a request.
 *  The OAuth `-code-verifier` cookie does not count. */
export function hasAuthCookie(cookieHeader = document.cookie) {
  return AUTH_COOKIE.test(cookieHeader);
}

import { AUTH_COOKIE, hasAuthCookie } from "@/lib/auth/has-auth-cookie";

/** Cached public pages render both the signed-in and the signed-out version of
 *  anything that depends on the visitor; CSS (`signed-in:`) shows one by this
 *  attribute on <html>. */
const AUTH_ATTRIBUTE = "data-auth";
const AUTH_CHANGED_EVENT = "lobyas:auth-changed";

/** Runs before the page paints, so the first frame already shows the right version. */
export const AUTH_RESTORE_SCRIPT = `try{if(${AUTH_COOKIE}.test(document.cookie))document.documentElement.setAttribute("${AUTH_ATTRIBUTE}","in")}catch(e){}`;

export function isSignedIn() {
  return document.documentElement.getAttribute(AUTH_ATTRIBUTE) === "in";
}

function setSignedIn(signedIn: boolean) {
  if (signedIn === isSignedIn()) return;
  document.documentElement.setAttribute(AUTH_ATTRIBUTE, signedIn ? "in" : "out");
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

let signingOut = false;

export function syncAuthAttribute() {
  const hasCookie = hasAuthCookie();
  if (!hasCookie) signingOut = false;
  // The cookie lasts until the logout response arrives; reading it before then would undo the switch.
  if (signingOut) return;
  setSignedIn(hasCookie);
}

/** Logging out redirects to a page that may be the one already open, so nothing
 *  would re-read the cookie. Called before the request so the page switches at once. */
export function markSignedOut() {
  signingOut = true;
  setSignedIn(false);
}

/** For a logout that failed: the cookie is still there, so the page is signed in again. */
export function restoreSignedIn() {
  signingOut = false;
  syncAuthAttribute();
}

export function onAuthChange(listener: () => void) {
  window.addEventListener(AUTH_CHANGED_EVENT, listener);
  return () => window.removeEventListener(AUTH_CHANGED_EVENT, listener);
}

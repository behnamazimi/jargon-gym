import { AUTH_COOKIE, hasAuthCookie } from "@/lib/auth/has-auth-cookie";

/** Cached public pages render both the signed-in and the signed-out version of
 *  anything that depends on the visitor; CSS (`signed-in:`) shows one by this
 *  attribute on <html>. */
export const AUTH_ATTRIBUTE = "data-auth";

/** Runs before the page paints, so the first frame already shows the right version. */
export const AUTH_RESTORE_SCRIPT = `try{if(${AUTH_COOKIE}.test(document.cookie))document.documentElement.setAttribute("${AUTH_ATTRIBUTE}","in")}catch(e){}`;

export function syncAuthAttribute() {
  document.documentElement.setAttribute(AUTH_ATTRIBUTE, hasAuthCookie() ? "in" : "out");
}

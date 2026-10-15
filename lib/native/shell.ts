/** The native shell adds this to the WebView's user agent (`appendUserAgent` in capacitor.config.ts). */
const NATIVE_SHELL_USER_AGENT = "LobyasApp";

export function isNativeShell(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent.includes(NATIVE_SHELL_USER_AGENT);
}

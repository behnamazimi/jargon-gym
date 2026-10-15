/** The native shell adds this to the WebView's user agent (`appendUserAgent` in capacitor.config.ts). */
const NATIVE_SHELL_USER_AGENT = "LobyasApp";

export function isNativeShell(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent.includes(NATIVE_SHELL_USER_AGENT);
}

/** Sent by the app's WebView on calls only it should make; a cross-site form can't set a custom header. */
export const NATIVE_REQUEST_HEADER = "x-lobyas-native";

type ShellOs = "ios" | "android";

export type Shell = { native: false } | { native: true; os: ShellOs | null };

/**
 * The native shell adds `LobyasApp/<os>` to the WebView's user agent
 * (`appendUserAgent` in capacitor.config.ts). An installed app older than that
 * change sends plain `LobyasApp`, so the os can be unknown.
 */
const SHELL_USER_AGENT = /LobyasApp(?:\/(ios|android))?/;

const NOT_NATIVE: Shell = { native: false };

export function parseShell(userAgent: string): Shell {
  const match = SHELL_USER_AGENT.exec(userAgent);
  if (!match) return NOT_NATIVE;
  return { native: true, os: (match[1] as ShellOs | undefined) ?? null };
}

const SHELL_ATTRIBUTE = "data-shell";

/** Cached pages can't read the user agent on the server, so it is copied to
 *  <html> before paint, for CSS (`native-app:`, `ios-app:`, `android-app:`). */
export const SHELL_RESTORE_SCRIPT = `try{var m=/LobyasApp(?:\\/(ios|android))?/.exec(navigator.userAgent);if(m)document.documentElement.setAttribute("${SHELL_ATTRIBUTE}",m[1]||"app")}catch(e){}`;

export function isNativeShell(): boolean {
  return typeof navigator !== "undefined" && parseShell(navigator.userAgent).native;
}

/** Sent by the app's WebView on calls only it should make; a cross-site form can't set a custom header.
 *  The user agent is a hint for the UI and is never proof of the app. */
export const NATIVE_REQUEST_HEADER = "x-lobyas-native";

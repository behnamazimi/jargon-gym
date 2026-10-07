import posthog from "posthog-js";
import { analyticsEnabled } from "./enabled";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

let running = false;

/** True only after the visitor agreed to analytics and PostHog is up. */
export function isAnalyticsRunning() {
  return running;
}

export function startAnalytics() {
  if (running || !analyticsEnabled || !posthogKey || !posthogHost) return;
  if (posthog.__loaded) {
    posthog.opt_in_capturing();
  } else {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST ?? "https://eu.posthog.com",
      defaults: "2026-01-30",
      capture_exceptions: true,
      debug: process.env.NODE_ENV === "development",
    });
  }
  running = true;
}

function isPostHogName(name: string) {
  return name.startsWith("ph_") || name.startsWith("__ph_");
}

function clearStore(store: Storage) {
  for (const name of Object.keys(store)) if (isPostHogName(name)) store.removeItem(name);
}

function clearCookies() {
  const parts = location.hostname.split(".");
  const domains = [undefined, location.hostname, `.${parts.slice(-2).join(".")}`];
  for (const entry of document.cookie.split(";")) {
    const name = entry.split("=")[0].trim();
    if (!isPostHogName(name)) continue;
    for (const domain of domains) {
      const scope = domain ? `; Domain=${domain}` : "";
      document.cookie = `${name}=; Max-Age=0; Path=/${scope}`;
    }
  }
}

/** Stops sending and removes everything PostHog saved on this device, even when
 *  it wasn't running on this page (a choice changed on another device). */
export function stopAnalytics() {
  if (running) posthog.opt_out_capturing();
  running = false;
  try {
    clearStore(localStorage);
    clearStore(sessionStorage);
  } catch {
    // Storage can be blocked; there is then nothing of ours to clear.
  }
  clearCookies();
}

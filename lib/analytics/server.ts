import { PostHog } from "posthog-node";
import { after } from "next/server";
import { hasAnalyticsConsent } from "@/lib/consent/server";
import { analyticsEnabled } from "./enabled";

type EventProperties = Record<string, boolean | number | string | null>;

let client: PostHog | null | undefined;

export function getPostHogServer() {
  if (client !== undefined) return client;
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.POSTHOG_SERVER_HOST ?? process.env.NEXT_PUBLIC_POSTHOG_HOST;
  client =
    analyticsEnabled && token && host
      ? new PostHog(token, { host, flushAt: 1, flushInterval: 0 })
      : null;
  return client;
}

/** Sends after the response, so analytics never slows or fails an action.
 *  Only for visitors who agreed to analytics. */
export function trackServer(distinctId: string, event: string, properties?: EventProperties) {
  const posthog = getPostHogServer();
  if (!posthog) return;
  after(async () => {
    if (!(await hasAnalyticsConsent())) return;
    await posthog
      .captureImmediate({ distinctId, event, properties })
      .catch((err: unknown) => console.error("PostHog capture failed:", err));
  });
}

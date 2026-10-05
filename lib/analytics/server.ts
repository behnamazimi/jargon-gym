import { PostHog } from "posthog-node";
import { after } from "next/server";

type EventProperties = Record<string, boolean | number | string | null>;

let client: PostHog | null | undefined;

export function getPostHogServer() {
  if (client !== undefined) return client;
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.POSTHOG_SERVER_HOST ?? process.env.NEXT_PUBLIC_POSTHOG_HOST;
  client = token && host ? new PostHog(token, { host, flushAt: 1, flushInterval: 0 }) : null;
  return client;
}

/** Sends after the response, so analytics never slows or fails an action. */
export function trackServer(distinctId: string, event: string, properties?: EventProperties) {
  const posthog = getPostHogServer();
  if (!posthog) return;
  after(() =>
    posthog
      .captureImmediate({ distinctId, event, properties })
      .catch((err: unknown) => console.error("PostHog capture failed:", err)),
  );
}

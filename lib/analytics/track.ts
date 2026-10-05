import posthog from "posthog-js";

type EventProperties = Record<string, boolean | number | string | null>;

function isConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST,
  );
}

export function track(event: string, properties?: EventProperties) {
  if (isConfigured()) posthog.capture(event, properties);
}

export function identifyUser(id: string, email: string | null) {
  if (isConfigured()) posthog.identify(id, email ? { email } : undefined);
}

export function resetAnalytics() {
  if (isConfigured()) posthog.reset();
}

export function trackException(error: unknown) {
  if (isConfigured()) posthog.captureException(error);
}

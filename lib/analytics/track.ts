import posthog from "posthog-js";
import { isAnalyticsRunning } from "./client";

type EventProperties = Record<string, boolean | number | string | null>;

export function track(event: string, properties?: EventProperties) {
  if (isAnalyticsRunning()) posthog.capture(event, properties);
}

export function identifyUser(id: string, email: string | null) {
  if (isAnalyticsRunning()) posthog.identify(id, email ? { email } : undefined);
}

export function resetAnalytics() {
  if (isAnalyticsRunning()) posthog.reset();
}

export function trackException(error: unknown) {
  if (isAnalyticsRunning()) posthog.captureException(error);
}

import { OpenTelemetry } from "@ai-sdk/otel";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { PostHogSpanProcessor } from "@posthog/ai/otel";
import { registerTelemetry } from "ai";
import { getPostHogServer } from "@/lib/analytics/server";

const posthogProjectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogHost = process.env.POSTHOG_SERVER_HOST ?? process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (!posthogProjectToken && process.env.NODE_ENV === "development") {
  throw new Error(
    "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured",
  );
}

if (!posthogHost && process.env.NODE_ENV === "development") {
  throw new Error(
    "NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured",
  );
}

export const posthogSpanProcessor =
  posthogProjectToken && posthogHost
    ? new PostHogSpanProcessor({
        projectToken: posthogProjectToken,
        host: posthogHost,
      })
    : null;

const sdk = posthogSpanProcessor
  ? new NodeSDK({
      resource: resourceFromAttributes({
        "service.name": "lobyas",
      }),
      spanProcessors: [posthogSpanProcessor],
    })
  : null;

sdk?.start();

export function register() {}

export async function onRequestError(err: unknown, request: { path: string; method: string }) {
  await getPostHogServer()?.captureExceptionImmediate(err, undefined, {
    path: request.path,
    method: request.method,
  });
}

registerTelemetry(
  new OpenTelemetry({
    enrichSpan: ({ runtimeContext }) => ({
      "posthog.distinct_id":
        typeof runtimeContext?.distinctId === "string" ? runtimeContext.distinctId : undefined,
      $ai_session_id:
        typeof runtimeContext?.sessionId === "string" ? runtimeContext.sessionId : undefined,
      $ai_trace_name:
        typeof runtimeContext?.traceName === "string" ? runtimeContext.traceName : undefined,
    }),
  }),
);

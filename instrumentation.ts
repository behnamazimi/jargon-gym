import { OpenTelemetry } from "@ai-sdk/otel";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { PostHogSpanProcessor } from "@posthog/ai/otel";
import { registerTelemetry } from "ai";
import { analyticsEnabled } from "@/lib/analytics/enabled";
import { getPostHogServer } from "@/lib/analytics/server";
import { consentFromCookieHeader } from "@/lib/consent/consent";

const posthogProjectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogHost = process.env.POSTHOG_SERVER_HOST ?? process.env.NEXT_PUBLIC_POSTHOG_HOST;

export const posthogSpanProcessor =
  analyticsEnabled && posthogProjectToken && posthogHost
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

export async function onRequestError(
  err: unknown,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string | string[] | undefined };
  },
) {
  const cookieHeader = [request.headers.cookie].flat().join("; ");
  if (consentFromCookieHeader(cookieHeader) !== "granted") return;
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

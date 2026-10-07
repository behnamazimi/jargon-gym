import { trace } from "@opentelemetry/api";
import { posthogSpanProcessor } from "@/instrumentation";
import type { AiObservabilityContext } from "./observability";

const tracer = trace.getTracer("lobyas-ai");

export async function runAiTurn<T>(
  context: AiObservabilityContext,
  callback: () => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(
    `ai.${context.traceName}`,
    {
      attributes: {
        "gen_ai.operation.name": context.traceName,
        "posthog.distinct_id": context.distinctId,
        $ai_session_id: context.sessionId,
        ...(context.anonymous ? { $process_person_profile: false } : {}),
      },
    },
    async (span) => {
      try {
        return await callback();
      } finally {
        span.end();
        await posthogSpanProcessor?.forceFlush();
      }
    },
  );
}

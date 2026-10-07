export type AiObservabilityContext = {
  distinctId: string;
  sessionId: string;
  traceName: "quiz_generation" | "story_generation";
  /** True when the trace isn't linked to a member. */
  anonymous: boolean;
};

/** A trace is linked to the member only if they allowed analytics; otherwise it
 *  carries a random id, so cost and failure numbers stay without identifying anyone. */
export function createAiTurn(
  userId: string,
  traceName: AiObservabilityContext["traceName"],
  analyticsAllowed: boolean,
): AiObservabilityContext {
  return {
    distinctId: analyticsAllowed ? userId : crypto.randomUUID(),
    sessionId: crypto.randomUUID(),
    traceName,
    anonymous: !analyticsAllowed,
  };
}

export function aiGenerationOptions(
  context: AiObservabilityContext | undefined,
  functionId: AiObservabilityContext["traceName"],
) {
  const telemetry = {
    functionId,
    // Prompts and answers hold what members wrote (terms, story outlines); never record them.
    recordInputs: false,
    recordOutputs: false,
    includeRuntimeContext: {
      distinctId: true,
      sessionId: true,
      traceName: true,
    },
  };

  return context
    ? {
        runtimeContext: {
          distinctId: context.distinctId,
          sessionId: context.sessionId,
          traceName: context.traceName,
        },
        telemetry,
      }
    : { telemetry };
}

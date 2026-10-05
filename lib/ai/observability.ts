export type AiObservabilityContext = {
  distinctId: string;
  sessionId: string;
  traceName: "quiz_generation" | "story_generation";
};

export function createAiTurn(
  distinctId: string,
  traceName: AiObservabilityContext["traceName"],
): AiObservabilityContext {
  return {
    distinctId,
    sessionId: crypto.randomUUID(),
    traceName,
  };
}

export function aiGenerationOptions(
  context: AiObservabilityContext | undefined,
  functionId: AiObservabilityContext["traceName"],
) {
  const telemetry = {
    functionId,
    recordInputs: true,
    recordOutputs: true,
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

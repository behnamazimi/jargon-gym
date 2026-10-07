import { describe, expect, it } from "vitest";
import { aiGenerationOptions, createAiTurn } from "./observability";

describe("AI observability", () => {
  it("links a trace to the member only when they allowed analytics", () => {
    const linked = createAiTurn("user-1", "quiz_generation", true);
    expect(linked.distinctId).toBe("user-1");
    expect(linked.anonymous).toBe(false);

    const anonymous = createAiTurn("user-1", "quiz_generation", false);
    expect(anonymous.distinctId).not.toBe("user-1");
    expect(anonymous.anonymous).toBe(true);
    expect(createAiTurn("user-1", "story_generation", false).distinctId).not.toBe(
      anonymous.distinctId,
    );
  });

  it("never records prompts or answers", () => {
    for (const context of [undefined, createAiTurn("user-1", "story_generation", true)]) {
      const { telemetry } = aiGenerationOptions(context, "story_generation");
      expect(telemetry.recordInputs).toBe(false);
      expect(telemetry.recordOutputs).toBe(false);
    }
  });
});

import { describe, expect, it } from "vitest";
import { busyFailure, creditsRefusedFailure, noAiFailure } from "./messages";

describe("failure copy", () => {
  it("tells a busy request to wait, without pointing at settings", () => {
    expect(busyFailure()).toMatchObject({ reason: "busy" });
  });

  it("does not ask own-key users to add a key when the feature is off", () => {
    const failure = noAiFailure("feature-off", "write stories");
    expect(failure.reason).toBe("feature-off");
    expect(failure.error).not.toMatch(/key/i);
  });

  it("asks to re-enter a key that can't be read, and never mentions credits", () => {
    const failure = noAiFailure("key-unreadable", "take AI quizzes");
    expect(failure).toMatchObject({ reason: "no-ai" });
    expect(failure.error).toMatch(/Enter it again/);
    expect(failure.error).not.toMatch(/credit/i);
  });

  it("keeps the existing copy for the credits outcomes", () => {
    expect(noAiFailure("none", "x").error).toMatch(/Add a provider and API key/);
    expect(noAiFailure("exhausted", "x").reason).toBe("credits");
    expect(
      creditsRefusedFailure({ reason: "insufficient", remaining: 2, cost: 5 }, "quiz").error,
    ).toMatch(/needs 5 credits and you have 2/);
  });
});

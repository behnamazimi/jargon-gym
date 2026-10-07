import { describe, expect, it } from "vitest";
import { busyFailure, creditsRefusedFailure, noAiFailure } from "./messages";

describe("failure copy", () => {
  it("tells a busy request to wait, without pointing at settings", () => {
    expect(busyFailure()).toMatchObject({ reason: "busy" });
  });

  it("says nothing about credits when the feature is off", () => {
    const failure = noAiFailure("feature-off", "write stories");
    expect(failure.reason).toBe("feature-off");
    expect(failure.error).not.toMatch(/credit/i);
  });

  it("keeps the existing copy for the credits outcomes", () => {
    expect(noAiFailure("none", "x").error).toMatch(/isn't available/);
    expect(noAiFailure("exhausted", "x")).toMatchObject({ reason: "credits" });
    expect(
      creditsRefusedFailure({ reason: "insufficient", remaining: 2, cost: 5 }, "quiz").error,
    ).toMatch(/needs 5 credits and you have 2/);
  });
});

import { describe, expect, it } from "vitest";
import { speechCostMicroUsd } from "./speech-cost";

describe("speechCostMicroUsd", () => {
  it("prices Murf per character", () => {
    expect(speechCostMicroUsd("murf", 1000)).toBe(10_000);
  });

  it("has no rate for ElevenLabs", () => {
    expect(speechCostMicroUsd("elevenlabs", 1000)).toBeNull();
  });
});

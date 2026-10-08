import { describe, expect, it } from "vitest";
import { tokenCostMicroUsd } from "./provider-cost";

const usage = { inputTokens: 2000, outputTokens: 650, reasoningTokens: 500 };

describe("tokenCostMicroUsd", () => {
  it("prices Gemini input and output (thinking included in output) at the 2026 rate", () => {
    expect(tokenCostMicroUsd("google", usage, new Date("2026-10-18"))).toBeCloseTo(
      2000 * 0.75 + 650 * 3.75,
    );
  });

  it("doubles after the introductory rate ends", () => {
    const before = tokenCostMicroUsd("google", usage, new Date("2026-12-31T23:00:00Z"));
    const after = tokenCostMicroUsd("google", usage, new Date("2027-01-01T00:00:00Z"));
    expect(after).toBeCloseTo(before * 2);
  });

  it("prices Haiku", () => {
    expect(tokenCostMicroUsd("anthropic", usage)).toBeCloseTo(2000 * 1 + 650 * 5);
  });
});

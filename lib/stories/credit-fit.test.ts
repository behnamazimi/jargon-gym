import { describe, expect, it } from "vitest";
import type { AiAccessView } from "@/lib/llm/types";
import { largestFittingLength, storyCostForLength, storyCreditUse } from "./credit-fit";

import { testCosts as costs } from "@/lib/ai-credits/test-costs";

describe("storyCostForLength", () => {
  it("charges one credit per term the story will use", () => {
    expect(storyCostForLength("short", 50, costs)).toBe(5);
    expect(storyCostForLength("medium", 50, costs)).toBe(6);
    expect(storyCostForLength("long", 50, costs)).toBe(7);
  });

  it("only counts the terms that are actually eligible", () => {
    expect(storyCostForLength("long", 4, costs)).toBe(4);
  });

  it("follows the admin's per-term weight", () => {
    expect(
      storyCostForLength("medium", 50, { ...costs, story: { ...costs.story, creditsPerUnit: 1 } }),
    ).toBe(10);
  });
});

describe("largestFittingLength", () => {
  it("suggests the longest shorter length that fits", () => {
    expect(largestFittingLength("long", 50, 8, costs)).toBe("medium");
    expect(largestFittingLength("long", 50, 5, costs)).toBe("short");
  });

  it("returns null when nothing shorter fits", () => {
    expect(largestFittingLength("long", 50, 4, costs)).toBeNull();
    expect(largestFittingLength("short", 50, 0, costs)).toBeNull();
  });
});

describe("storyCreditUse", () => {
  const view = (remaining: number): AiAccessView => ({
    kind: "credits",
    providerLabel: "Google",
    remaining,
    total: 130,
    costs,
  });

  it("prices a story by the terms it will use", () => {
    expect(storyCreditUse(view(50), "medium", 50)).toMatchObject({ cost: 6, overBalance: false });
  });

  it("flags a story that costs more than the balance", () => {
    expect(storyCreditUse(view(5), "medium", 50)).toMatchObject({ cost: 6, overBalance: true });
  });

  it("charges nothing when AI is unavailable", () => {
    const none: AiAccessView = { kind: "unavailable", reason: "exhausted" };
    expect(storyCreditUse(none, "long", 50)).toEqual({
      credits: null,
      cost: 0,
      overBalance: false,
    });
  });
});

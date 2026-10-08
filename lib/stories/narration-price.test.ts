import { describe, expect, it } from "vitest";
import { testCosts } from "@/lib/ai-credits/test-costs";
import type { AiAccessView } from "@/lib/llm/types";
import { narrationPrice } from "./narration-price";

const credits = (remaining: number): AiAccessView => ({
  kind: "credits",
  providerLabel: "Google",
  remaining,
  total: 70,
  costs: testCosts,
  topUp: { available: false, reason: "balance", amount: 30 },
});

const story = { title: "Title", segments: [{ text: "x".repeat(500) }] };

describe("narrationPrice", () => {
  it("prices the spoken text, title included", () => {
    // "Title." + blank line + 500 characters = 508 characters
    expect(narrationPrice(credits(30), story)).toEqual({
      cost: 4,
      remaining: 30,
      topUp: { available: false, reason: "balance", amount: 30 },
    });
  });

  it("is null when credits aren't in play", () => {
    expect(narrationPrice({ kind: "unavailable", reason: "exhausted" }, story)).toBeNull();
  });
});

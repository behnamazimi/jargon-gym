import { describe, expect, it } from "vitest";
import type { AiAccessView } from "@/lib/llm/types";
import { quizCreditUse } from "./credit-use";

const costs = { quizPerQuestion: 1, storyPerTerm: 1 };
const credits = (remaining: number): AiAccessView => ({
  kind: "credits",
  providerLabel: "Google",
  remaining,
  total: 130,
  costs,
});

describe("quizCreditUse", () => {
  it("prices an AI quiz per question", () => {
    expect(quizCreditUse("ai", credits(50), 10)).toMatchObject({ cost: 10, overBalance: false });
  });

  it("flags a quiz that costs more than the balance", () => {
    expect(quizCreditUse("ai", credits(7), 10)).toMatchObject({ cost: 10, overBalance: true });
  });

  it("allows a quiz that uses the last credits exactly", () => {
    expect(quizCreditUse("ai", credits(10), 10).overBalance).toBe(false);
  });

  it("never charges a simple quiz", () => {
    expect(quizCreditUse("simple", credits(0), 10)).toEqual({
      credits: null,
      cost: 0,
      overBalance: false,
    });
  });

  it("charges nothing when AI is unavailable", () => {
    const none: AiAccessView = { kind: "unavailable", reason: "exhausted" };
    expect(quizCreditUse("ai", none, 10)).toMatchObject({ credits: null, overBalance: false });
  });
});

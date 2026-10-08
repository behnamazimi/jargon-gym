import { describe, expect, it } from "vitest";
import { priceLines, refillLines } from "./explainer";
import { testCosts as costs } from "./test-costs";

describe("priceLines", () => {
  it("states each price from the live price rows", () => {
    expect(priceLines(costs)).toEqual([
      "An AI quiz costs 1 credit per question.",
      "A story costs 5 to 7 credits.",
      "A story's audio costs about 7.5 credits per 1,000 characters.",
    ]);
  });

  it("follows a price change", () => {
    const pricier = {
      ...costs,
      quiz: { ...costs.quiz, creditsPerUnit: 2 },
      narration_story: { ...costs.narration_story, creditsPerUnit: 10 },
    };
    const lines = priceLines(pricier);
    expect(lines[0]).toBe("An AI quiz costs 2 credits per question.");
    expect(lines[2]).toBe("A story's audio costs about 10 credits per 1,000 characters.");
  });

  it("gives one number when every story costs the same", () => {
    const flat = { ...costs, story: { baseCredits: 4, creditsPerUnit: 0, unitSize: 1 } };
    expect(priceLines(flat)[1]).toBe("A story costs 4 credits.");
  });
});

describe("refillLines", () => {
  it("says monthly credits expire at the end of the last day, in UTC", () => {
    expect(
      refillLines({
        expiry: { at: "2026-11-01T00:00:00+00:00", amount: 12 },
        nextRefill: { at: "2026-11-01T00:00:00+00:00", amount: 20 },
      }),
    ).toEqual([
      "12 credits expire at the end of October 31 (UTC).",
      "20 credits refill on November 1 (UTC).",
    ]);
  });

  it("names the day for a credit that lapses mid-day", () => {
    expect(
      refillLines({ expiry: { at: "2027-01-06T14:30:00Z", amount: 1 }, nextRefill: null }),
    ).toEqual(["1 credit expires on January 6 (UTC)."]);
  });

  it("shows only the part that applies", () => {
    expect(
      refillLines({ expiry: null, nextRefill: { at: "2026-11-01T00:00:00Z", amount: 30 } }),
    ).toEqual(["30 credits refill on November 1 (UTC)."]);
    expect(refillLines({ expiry: null, nextRefill: null })).toEqual([]);
    expect(refillLines(null)).toEqual([]);
  });
});

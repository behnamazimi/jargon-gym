import { describe, expect, it } from "vitest";
import { refillLines } from "./explainer";

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

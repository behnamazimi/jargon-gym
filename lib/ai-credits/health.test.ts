import { describe, expect, it } from "vitest";
import { refundsLookHigh } from "./health";

describe("refundsLookHigh", () => {
  it("stays quiet for a few one-off failures", () => {
    expect(refundsLookHigh({ spends24h: 40, refunds24h: 2 })).toBe(false);
    expect(refundsLookHigh({ spends24h: 100, refunds24h: 10 })).toBe(false);
  });

  it("warns when about half or more of the requests failed", () => {
    expect(refundsLookHigh({ spends24h: 6, refunds24h: 3 })).toBe(true);
    expect(refundsLookHigh({ spends24h: 20, refunds24h: 20 })).toBe(true);
  });

  it("needs a handful of refunds, not one unlucky request", () => {
    expect(refundsLookHigh({ spends24h: 1, refunds24h: 1 })).toBe(false);
    expect(refundsLookHigh({ spends24h: 0, refunds24h: 0 })).toBe(false);
  });
});

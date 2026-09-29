import { describe, expect, it } from "vitest";
import { refundsLookHigh } from "./health";

const summary = (spends24h: number, refunds24h: number, refundUsers24h = 3) => ({
  spends24h,
  refunds24h,
  refundUsers24h,
});

describe("refundsLookHigh", () => {
  it("stays quiet for a few one-off failures", () => {
    expect(refundsLookHigh(summary(40, 2))).toBe(false);
    expect(refundsLookHigh(summary(100, 10))).toBe(false);
  });

  it("warns when about half or more of the requests failed", () => {
    expect(refundsLookHigh(summary(6, 3))).toBe(true);
    expect(refundsLookHigh(summary(20, 20))).toBe(true);
  });

  it("stays quiet just below the threshold", () => {
    expect(refundsLookHigh(summary(7, 3))).toBe(false);
    expect(refundsLookHigh(summary(5, 2))).toBe(false);
  });

  it("needs a handful of refunds, not one unlucky request", () => {
    expect(refundsLookHigh(summary(1, 1))).toBe(false);
    expect(refundsLookHigh(summary(0, 0))).toBe(false);
  });

  it("does not blame the key when only one person is affected", () => {
    expect(refundsLookHigh(summary(5, 5, 1))).toBe(false);
    expect(refundsLookHigh(summary(5, 5, 2))).toBe(true);
  });
});

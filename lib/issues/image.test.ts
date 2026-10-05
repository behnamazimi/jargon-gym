import { describe, expect, it } from "vitest";
import { fitWithin, MAX_SIDE } from "./image";

describe("fitWithin", () => {
  it("leaves small images alone", () => {
    expect(fitWithin(1200, 800)).toEqual({ width: 1200, height: 800 });
  });

  it("scales the longest side down to the limit", () => {
    expect(fitWithin(3024, 1964)).toEqual({ width: MAX_SIDE, height: 1299 });
    expect(fitWithin(1170, 2532)).toEqual({ width: 924, height: MAX_SIDE });
  });

  it("never returns a zero side", () => {
    expect(fitWithin(10_000, 1)).toEqual({ width: MAX_SIDE, height: 1 });
  });
});

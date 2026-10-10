import { describe, expect, it } from "vitest";
import { GENERATING_STAGES } from "./generating-stages";

describe("GENERATING_STAGES", () => {
  it("starts at zero and only moves forward in time", () => {
    expect(GENERATING_STAGES[0].startsAtSeconds).toBe(0);
    const times = GENERATING_STAGES.map((stage) => stage.startsAtSeconds);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(new Set(times).size).toBe(times.length);
  });
});

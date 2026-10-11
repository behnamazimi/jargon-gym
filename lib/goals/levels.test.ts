import { describe, expect, it } from "vitest";
import { goalForLevel, nearestLevel, parseDailyGoals, stepGoal } from "./levels";

describe("nearestLevel", () => {
  it("is off without a goal", () => {
    expect(nearestLevel("read", null)).toBe("off");
  });

  it("matches the presets exactly", () => {
    expect(nearestLevel("read", 10)).toBe("light");
    expect(nearestLevel("review", 20)).toBe("steady");
    expect(nearestLevel("quiz", 20)).toBe("intense");
  });

  it("picks the closest preset for a fine-tuned goal", () => {
    expect(nearestLevel("read", 25)).toBe("steady");
    expect(nearestLevel("read", 35)).toBe("intense");
    expect(nearestLevel("quiz", 5)).toBe("light");
    expect(nearestLevel("quiz", 100)).toBe("intense");
  });
});

describe("goalForLevel", () => {
  it("uses each tier's own numbers", () => {
    expect(goalForLevel("read", "steady")).toBe(20);
    expect(goalForLevel("quiz", "steady")).toBe(10);
    expect(goalForLevel("review", "off")).toBeNull();
  });
});

describe("stepGoal", () => {
  it("moves in fives", () => {
    expect(stepGoal(20, 1)).toBe(25);
    expect(stepGoal(20, -1)).toBe(15);
  });

  it("turns the tier off below the smallest goal and back on from off", () => {
    expect(stepGoal(5, -1)).toBeNull();
    expect(stepGoal(null, -1)).toBeNull();
    expect(stepGoal(null, 1)).toBe(5);
  });

  it("stops at the ceiling", () => {
    expect(stepGoal(200, 1)).toBe(200);
  });
});

describe("parseDailyGoals", () => {
  it("is null for a missing value", () => {
    expect(parseDailyGoals(null)).toBeNull();
    expect(parseDailyGoals([])).toBeNull();
  });

  it("keeps whole numbers in range and turns the rest off", () => {
    expect(parseDailyGoals({ read: 20, review: -3, quiz: "10" })).toEqual({
      read: 20,
      review: null,
      quiz: null,
    });
    expect(parseDailyGoals({ read: 2.5, review: 999 })).toEqual({
      read: null,
      review: null,
      quiz: null,
    });
  });
});

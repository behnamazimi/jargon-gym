import { describe, expect, it } from "vitest";
import {
  KNOWN_MIN_TEST_COUNT,
  KNOWN_THRESHOLD,
  MASTERY_WEIGHT_RECALL,
  MASTERY_WEIGHT_RECOGNITION,
  UNKNOWN_THRESHOLD,
} from "./constants";
import {
  aggregateMastery,
  blendMastery,
  confidence,
  crossedThresholds,
  deriveKnownLabel,
  masteryAdjusted,
} from "./mastery";

describe("confidence", () => {
  it("is 0 at n=0 and approaches 1 as n grows", () => {
    expect(confidence(0)).toBe(0);
    expect(confidence(100)).toBeCloseTo(1, 5);
  });

  it("is monotonically increasing", () => {
    expect(confidence(3)).toBeGreaterThan(confidence(1));
    expect(confidence(10)).toBeGreaterThan(confidence(3));
  });
});

describe("blendMastery", () => {
  it("weights recall and recognition when both are present", () => {
    const mastery = blendMastery({
      familiarityUsed: 0,
      recallRetrievability: 0.9,
      recognitionRetrievability: 0.8,
    });
    expect(mastery).toBeCloseTo(MASTERY_WEIGHT_RECALL * 0.9 + MASTERY_WEIGHT_RECOGNITION * 0.8, 10);
  });

  it("gives recall the recognition weight too when the term was never quizzed", () => {
    const mastery = blendMastery({
      familiarityUsed: 0,
      recallRetrievability: 0.9,
      recognitionRetrievability: null,
    });
    expect(mastery).toBeCloseTo((MASTERY_WEIGHT_RECALL + MASTERY_WEIGHT_RECOGNITION) * 0.9, 10);
  });

  it("keeps a never-reviewed term below the known line, however well it was quizzed", () => {
    const mastery = blendMastery({
      familiarityUsed: 0.35,
      recallRetrievability: null,
      recognitionRetrievability: 1,
    });
    expect(mastery).toBeLessThan(KNOWN_THRESHOLD);
  });
});

describe("masteryAdjusted / deriveKnownLabel", () => {
  it("a single lucky grade (low n) can't cross the known threshold even with mastery=1", () => {
    const adj = masteryAdjusted(1, 1);
    expect(adj).toBeLessThan(KNOWN_THRESHOLD);
    expect(deriveKnownLabel(adj, 1)).not.toBe("known");
  });

  it("known requires both the mastery threshold and the n≥3 gate", () => {
    const highMasteryLowN = masteryAdjusted(0.95, KNOWN_MIN_TEST_COUNT - 1);
    expect(deriveKnownLabel(highMasteryLowN, KNOWN_MIN_TEST_COUNT - 1)).not.toBe("known");

    const highMasteryEnoughN = masteryAdjusted(0.95, KNOWN_MIN_TEST_COUNT + 5);
    expect(deriveKnownLabel(highMasteryEnoughN, KNOWN_MIN_TEST_COUNT + 5)).toBe("known");
  });

  it("below the unknown threshold is always unknown regardless of n", () => {
    expect(deriveKnownLabel(UNKNOWN_THRESHOLD - 0.01, 100)).toBe("unknown");
  });

  it("the gap between thresholds is 'learning'", () => {
    expect(deriveKnownLabel((KNOWN_THRESHOLD + UNKNOWN_THRESHOLD) / 2, 100)).toBe("learning");
  });
});

describe("aggregateMastery", () => {
  it("is 0 for an empty set", () => {
    expect(aggregateMastery([])).toBe(0);
  });

  it("averages the given adjusted-mastery values", () => {
    expect(aggregateMastery([0.2, 0.4, 0.6])).toBeCloseTo(0.4, 10);
  });
});

describe("crossedThresholds", () => {
  it("passes the label through on a success", () => {
    expect(crossedThresholds("known", true)).toEqual({
      known: true,
      learning: true,
    });
    expect(crossedThresholds("learning", true)).toEqual({
      known: false,
      learning: true,
    });
    expect(crossedThresholds("unknown", true)).toEqual({
      known: false,
      learning: false,
    });
  });

  it("never stamps on a miss, whatever the post-event label says", () => {
    expect(crossedThresholds("known", false)).toEqual({
      known: false,
      learning: false,
    });
    expect(crossedThresholds("learning", false)).toEqual({
      known: false,
      learning: false,
    });
    expect(crossedThresholds("unknown", false)).toEqual({
      known: false,
      learning: false,
    });
  });
});

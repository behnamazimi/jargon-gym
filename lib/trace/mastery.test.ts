import { describe, expect, it } from "vitest";
import {
  FAMILIARITY_CAP,
  KNOWN_MIN_TEST_COUNT,
  KNOWN_THRESHOLD,
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
  const blend = (recall: number | null, recognition: number | null, familiarity = 0) =>
    blendMastery({
      familiarityUsed: familiarity,
      recallRetrievability: recall,
      recognitionKnowledge: recognition,
    });

  it("is 0 when neither Review nor Quiz has tested the term, whatever Read did", () => {
    expect(blend(null, null, FAMILIARITY_CAP)).toBe(0);
  });

  it("keeps a term never quizzed below Known, however strong its recall", () => {
    expect(blend(1, null, FAMILIARITY_CAP)).toBeLessThan(KNOWN_THRESHOLD);
  });

  it("lets a passed quiz lift strong recall over the Known line", () => {
    expect(blend(0.97, 0.95)).toBeGreaterThan(KNOWN_THRESHOLD);
  });

  it("drops when recognition falls below the untested coin flip", () => {
    expect(blend(0.95, 0.3)).toBeLessThan(blend(0.95, null));
  });

  it("raises a weak term more than a strong one for the same reading", () => {
    const lift = (recall: number) => blend(recall, 0.8, FAMILIARITY_CAP) - blend(recall, 0.8);
    expect(lift(0.4)).toBeGreaterThan(lift(0.95));
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

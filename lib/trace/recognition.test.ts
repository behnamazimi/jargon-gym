import { describe, expect, it } from "vitest";
import { RECOGNITION_INITIAL_PRIOR, RECOGNITION_STABILITY_SCALE } from "./constants";
import { posteriorToStability, retrievability, updatePosterior } from "./recognition";

describe("updatePosterior", () => {
  it("defaults the prior to 0.5 only at the first answer", () => {
    const afterCorrect = updatePosterior(null, true, "multiple_choice", null);
    // P(knows|correct) with p=0.5: (0.95*0.5) / (0.95*0.5 + 0.25*0.5) = 0.95/1.2
    expect(afterCorrect).toBeCloseTo(0.95 / 1.2, 10);
  });

  it("a correct answer always raises the posterior", () => {
    const p = 0.5;
    const next = updatePosterior(p, true, "multiple_choice", null);
    expect(next).toBeGreaterThan(p);
  });

  it("an incorrect answer lowers the posterior", () => {
    const p = 0.7;
    const next = updatePosterior(p, false, "multiple_choice", null);
    expect(next).toBeLessThan(p);
  });

  it("true/false guessing (0.5) softens the correct-answer boost vs MCQ (0.25)", () => {
    const p = 0.5;
    const mcq = updatePosterior(p, true, "multiple_choice", null);
    const tf = updatePosterior(p, true, "true_false", null);
    expect(mcq).toBeGreaterThan(tf);
  });

  it("cross-track penalty softening: high recall retrievability blunts the failure penalty", () => {
    const p = 0.7;
    // No recall history => full, unsoftened penalty (steepest drop).
    const unsoftened = updatePosterior(p, false, "multiple_choice", null);
    const softenedLow = updatePosterior(p, false, "multiple_choice", 0.2);
    const softenedHigh = updatePosterior(p, false, "multiple_choice", 0.9);

    // More recall retrievability at the moment of failure => less of a drop.
    expect(softenedLow).toBeGreaterThanOrEqual(unsoftened);
    expect(softenedHigh).toBeGreaterThan(softenedLow);
  });
});

describe("posteriorToStability", () => {
  it("S_g = 1 + k_g · p", () => {
    expect(posteriorToStability(0)).toBe(1);
    expect(posteriorToStability(1)).toBe(1 + RECOGNITION_STABILITY_SCALE);
    expect(posteriorToStability(RECOGNITION_INITIAL_PRIOR)).toBeCloseTo(
      1 + RECOGNITION_STABILITY_SCALE * RECOGNITION_INITIAL_PRIOR,
      10,
    );
  });
});

describe("retrievability", () => {
  it("is 1 at t=0 and decays monotonically", () => {
    expect(retrievability(5, 0)).toBe(1);
    expect(retrievability(5, 10)).toBeGreaterThan(retrievability(5, 20));
  });
});

import type { CreditCosts } from "./types";

/** The prices the migration seeds, for tests. */
export const testCosts: CreditCosts = {
  quiz: { baseCredits: 0, creditsPerUnit: 1, unitSize: 1 },
  story: { baseCredits: 2, creditsPerUnit: 0.5, unitSize: 1 },
  narration_story: { baseCredits: 0, creditsPerUnit: 7.5, unitSize: 1000 },
};

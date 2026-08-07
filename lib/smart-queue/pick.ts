/** Term selection from scored candidates.
 */

import type { PickContext, ReviewCandidate, ReviewPreset, ScoredCandidate } from "./types";
import { scoreCandidate } from "./score";
import { getContextWeights } from "./presets";

/** Fisher-Yates shuffle of arr[start..end] (inclusive), in place. */
function shuffleRange<T>(arr: T[], start: number, end: number): void {
  for (let i = end; i > start; i--) {
    const j = start + Math.floor(Math.random() * (i - start + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/** Randomize order within each contiguous run of equal-score candidates. */
function shuffleTies(scored: ScoredCandidate[]): void {
  let start = 0;
  for (let i = 1; i <= scored.length; i++) {
    if (i === scored.length || scored[i].score !== scored[start].score) {
      shuffleRange(scored, start, i - 1);
      start = i;
    }
  }
}

export function pickTerms(
  candidates: ReviewCandidate[],
  preset: ReviewPreset,
  limit: number,
  context: PickContext = "default",
): ScoredCandidate[] {
  if (candidates.length === 0 || limit <= 0) {
    return [];
  }

  const weights = getContextWeights(preset, context);
  const now = new Date();

  const scored: ScoredCandidate[] = candidates.map((candidate) => {
    const { score, reasons } = scoreCandidate(candidate, weights, now);
    return {
      ...candidate,
      score,
      reasons,
    };
  });

  // Sort by score desc; same-score candidates are shuffled, not tie-broken by ID
  scored.sort((a, b) => b.score - a.score);
  shuffleTies(scored);

  return scored.slice(0, limit);
}

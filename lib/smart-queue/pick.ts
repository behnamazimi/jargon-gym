/** Term selection from scored candidates.
 */

import type { ReviewCandidate, ReviewPreset, ScoredCandidate } from "./types";
import { computeScore } from "./score";
import { getPresetWeights } from "./presets";

export function pickTerms(
  candidates: ReviewCandidate[],
  preset: ReviewPreset,
  limit: number,
): ScoredCandidate[] {
  if (candidates.length === 0 || limit <= 0) {
    return [];
  }

  const weights = getPresetWeights(preset);
  const now = new Date();

  const scored: ScoredCandidate[] = candidates.map((candidate) => ({
    ...candidate,
    score: computeScore(candidate, weights, now),
  }));

  // Sort by score desc, tie-break by term ID for stability
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.termId.localeCompare(b.termId);
  });

  return scored.slice(0, limit);
}

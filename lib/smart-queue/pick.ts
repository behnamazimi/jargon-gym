/** Term selection from scored candidates.
 */

import type { PickContext, ReviewCandidate, ReviewPreset, ScoredCandidate } from "./types";
import { scoreCandidate } from "./score";
import { getContextWeights } from "./presets";

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

  // Sort by score desc, tie-break by term ID for stability
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.termId.localeCompare(b.termId);
  });

  return scored.slice(0, limit);
}

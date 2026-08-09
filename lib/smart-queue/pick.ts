/** Term selection from scored candidates.
 */

import type { PickContext, ReviewCandidate, ScoredCandidate } from "./types";
import { scoreCandidate } from "./score";
import { WEIGHTS } from "./weights";

export function pickTerms(
  candidates: ReviewCandidate[],
  limit: number,
  context: PickContext,
): ScoredCandidate[] {
  if (candidates.length === 0 || limit <= 0) {
    return [];
  }

  const now = new Date();

  const scored: ScoredCandidate[] = candidates.map((candidate) => {
    const { score, reasons } = scoreCandidate(candidate, WEIGHTS, context, now);
    return {
      ...candidate,
      score,
      reasons,
    };
  });

  // Stable score-desc sort — equal scores keep candidate-fetch order so debug
  // and live picks (read/review/quiz) agree on the next term.
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}

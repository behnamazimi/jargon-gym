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

  // Sort by score desc; same-score candidates keep their incoming (organic) order —
  // Array.prototype.sort is stable, so no explicit tie-break needed.
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}

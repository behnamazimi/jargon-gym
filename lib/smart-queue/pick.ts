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

  // Score-desc, freshly random within equal scores so same-score terms from
  // different collections mix (stable fetch order used to clump by collection).
  scored.sort((a, b) => b.score - a.score);
  shuffleEqualScoreRuns(scored);

  return scored.slice(0, limit);
}

/** Fisher–Yates within each contiguous equal-score run (already score-sorted). */
function shuffleEqualScoreRuns(scored: ScoredCandidate[]): void {
  let i = 0;
  while (i < scored.length) {
    let j = i + 1;
    while (j < scored.length && scored[j]!.score === scored[i]!.score) {
      j++;
    }
    shuffleRange(scored, i, j);
    i = j;
  }
}

function shuffleRange(arr: ScoredCandidate[], start: number, end: number): void {
  for (let i = end - 1; i > start; i--) {
    const j = start + Math.floor(Math.random() * (i - start + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}

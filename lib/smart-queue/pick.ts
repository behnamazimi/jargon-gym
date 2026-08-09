/** Term selection from scored candidates.
 */

import { shuffle } from "es-toolkit";
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

  // Shuffle first, then stable-sort by score desc so equal scores surface in a
  // fresh random order each pick instead of the candidate-fetch order.
  const ordered = shuffle(scored);
  ordered.sort((a, b) => b.score - a.score);

  return ordered.slice(0, limit);
}

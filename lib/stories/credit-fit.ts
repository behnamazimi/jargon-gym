import { storyCost } from "@/lib/ai-credits/costs";
import type { CreditCosts } from "@/lib/ai-credits/types";
import type { AiAccessView, CreditUse } from "@/lib/llm/types";
import { termsForLength } from "./length";
import { PIECE_LENGTHS, type PieceLength } from "./types";

/** Credits a story of this length costs, given how many terms are eligible. */
export function storyCostForLength(
  length: PieceLength,
  eligibleCount: number,
  costs: CreditCosts,
): number {
  return storyCost(Math.min(eligibleCount, termsForLength(length)), costs);
}

/** The longest length shorter than `current` that fits the balance, if any. */
export function largestFittingLength(
  current: PieceLength,
  eligibleCount: number,
  remaining: number,
  costs: CreditCosts,
): PieceLength | null {
  const shorter = PIECE_LENGTHS.slice(0, PIECE_LENGTHS.indexOf(current)).reverse();
  return (
    shorter.find((length) => storyCostForLength(length, eligibleCount, costs) <= remaining) ?? null
  );
}

/** What this story would spend, when it runs on AI credits. */
export function storyCreditUse(
  ai: AiAccessView,
  pieceLength: PieceLength,
  eligibleCount: number,
): CreditUse {
  const credits = ai.kind === "credits" ? ai : null;
  const cost = credits ? storyCostForLength(pieceLength, eligibleCount, credits.costs) : 0;
  return { credits, cost, overBalance: credits !== null && cost > credits.remaining };
}

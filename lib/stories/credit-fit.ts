import { storyCost } from "@/lib/ai-credits/costs";
import type { CreditCosts } from "@/lib/ai-credits/types";
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

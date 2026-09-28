import { AGAIN, EASY, GOOD, HARD, type ReviewGrade } from "@/lib/trace";

/** What the focused element does with keys: text fields own every key,
 *  buttons and links own Space/Enter (their own activation). */
export type ReviewKeyTarget = "editable" | "interactive" | "other";

export type ReviewKeyInput = {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  repeat?: boolean;
  target: ReviewKeyTarget;
};

export type ReviewCardState = {
  revealed: boolean;
  rated: boolean;
};

/** `consume` swallows the key (no page scroll) without doing anything;
 *  `ignore` leaves the event alone. */
export type ReviewKeyAction =
  | { type: "reveal" }
  | { type: "grade"; grade: ReviewGrade }
  | { type: "previous" }
  | { type: "next" }
  | { type: "consume" }
  | { type: "ignore" };

const GRADE_KEYS: Record<string, ReviewGrade> = {
  "1": AGAIN,
  "2": HARD,
  "3": GOOD,
  "4": EASY,
};

/** A revealed card has to be graded before moving on. Before reveal,
 *  moving forward is a deliberate skip; a card you already graded (you
 *  went back to it) can be left again. */
export function canMoveForward({ revealed, rated }: ReviewCardState): boolean {
  return !revealed || rated;
}

/** Space/Enter only ever reveal. Once revealed they do nothing — a card is
 *  left by grading it, never by a stray Enter. */
function activationKeyAction(input: ReviewKeyInput, card: ReviewCardState): ReviewKeyAction {
  if (input.target === "interactive") return { type: "ignore" };
  if (card.revealed || input.repeat) return { type: "consume" };
  return { type: "reveal" };
}

export function reviewKeyAction(input: ReviewKeyInput, card: ReviewCardState): ReviewKeyAction {
  if (input.metaKey || input.ctrlKey || input.altKey) return { type: "ignore" };
  if (input.target === "editable") return { type: "ignore" };
  if (input.key === " " || input.key === "Enter") return activationKeyAction(input, card);
  if (input.repeat) return { type: "ignore" };

  const grade = GRADE_KEYS[input.key];
  if (grade !== undefined) {
    return card.revealed ? { type: "grade", grade } : { type: "ignore" };
  }

  if (input.key === "ArrowLeft") return { type: "previous" };
  if (input.key === "ArrowRight") {
    return canMoveForward(card) ? { type: "next" } : { type: "ignore" };
  }

  return { type: "ignore" };
}

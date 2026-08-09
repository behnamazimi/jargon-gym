/** Human-readable labels for pick reasons (UI). */

import { ENGAGED_MIN_COUNT } from "./weights";
import type { PickContext, PickReason } from "./types";

/** Past-participle wording per activity, for reasons whose meaning depends on which
 *  count/timestamp fired (unseen/stale/steady all key off the context's own field). */
const VERB: Record<PickContext, string> = {
  read: "read",
  review: "reviewed",
  quiz: "quizzed",
};

const STATIC_LABELS: Partial<Record<PickReason, string>> = {
  new: "Recently added",
  struggling: "Struggling",
  repeat_fail: "Repeatedly missed",
  engaged_untested: `Read ${ENGAGED_MIN_COUNT}+ times, not tested`,
  abandoned_review: "Left mid-review",
  mastered_cooldown: "Recently mastered",
  cross_fail: "Missed elsewhere recently",
  recently_engaged: "Recently read",
};

export function formatPickReason(reason: PickReason, context: PickContext): string {
  const verb = VERB[context];

  switch (reason) {
    case "unseen":
      return `Never ${verb}`;
    case "stale":
      return `Not ${verb} recently`;
    case "steady":
      return `Recently ${verb}`;
    default:
      return STATIC_LABELS[reason] ?? reason;
  }
}

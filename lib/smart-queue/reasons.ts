/** Human-readable labels for pick reasons (UI). */

import { ENGAGED_MIN_COUNT } from "./weights";
import type { PickReason } from "./types";

const LABELS: Record<PickReason, string> = {
  unseen: "Never read",
  new: "Recently added",
  struggling: "Struggling",
  repeat_fail: "Repeatedly missed",
  engaged_untested: `Read ${ENGAGED_MIN_COUNT}+ times, not tested`,
  abandoned_review: "Left mid-review",
  stale: "Not seen recently",
  mastered_cooldown: "Recently mastered",
  cross_fail: "Missed elsewhere recently",
  recently_engaged: "Recently read",
  steady: "Recently reviewed",
};

export function formatPickReason(reason: PickReason): string {
  return LABELS[reason];
}

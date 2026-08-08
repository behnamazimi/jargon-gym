/** Human-readable labels for pick reasons (UI). */

import { NEVER_RECALLED_MIN_SEEN } from "./presets";
import type { PickReason } from "./types";

const LABELS: Record<PickReason, string> = {
  unseen: "Never read",
  new: "Recently added",
  learning: "Still learning",
  forgot: "Forgot",
  repeat_fail: "Repeatedly forgotten",
  never_recalled: `Read ${NEVER_RECALLED_MIN_SEEN}+ times, never recalled`,
  browse_only: `Browsed ${NEVER_RECALLED_MIN_SEEN}+ times, never read`,
  abandoned_review: "Left mid-review",
  stale: "Not seen recently",
  solid_cooldown: "Recently marked solid",
  recently_read: "Recently read",
  steady: "Recently reviewed",
};

export function formatPickReason(reason: PickReason): string {
  return LABELS[reason];
}

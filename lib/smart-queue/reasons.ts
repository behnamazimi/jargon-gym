/** Human-readable labels for pick reasons (UI). */

import { NEVER_RECALLED_MIN_SEEN } from "./presets";
import type { PickReason } from "./types";

const LABELS: Record<PickReason, string> = {
  unseen: "Never seen",
  new: "Recently added",
  learning: "Still learning",
  forgot: "Forgot",
  never_recalled: `Seen/read ${NEVER_RECALLED_MIN_SEEN}+ times, never recalled`,
  abandoned_review: "Left mid-review",
  stale: "Not seen recently",
  solid_cooldown: "Recently marked solid",
  steady: "Recently reviewed",
};

export function formatPickReason(reason: PickReason): string {
  return LABELS[reason];
}

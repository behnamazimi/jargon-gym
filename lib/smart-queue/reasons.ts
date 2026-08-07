/** Human-readable labels for pick reasons (UI). */

import { SHOWN_WITHOUT_SOLID_MIN_SEEN } from "./presets";
import type { PickReason } from "./types";

const LABELS: Record<PickReason, string> = {
  unseen: "Never seen",
  new: "Recently added",
  learning: "Still learning",
  forgot: "Forgot",
  shown_stuck: `Seen ${SHOWN_WITHOUT_SOLID_MIN_SEEN}+ times, not solid`,
  stale: "Not seen recently",
  solid_cooldown: "Recently marked solid",
  steady: "Recently reviewed",
};

export function formatPickReason(reason: PickReason): string {
  return LABELS[reason];
}

"use client";

import { useMountEffect } from "@/hooks/use-mount-effect";
import type { GoalTier } from "@/lib/goals/levels";
import { goalCaughtUp } from "./goal-store";

/** Rendered beside a tier's "nothing left" state. Goals cover every active
 *  collection, so a caught-up single collection doesn't count. */
export function GoalCaughtUp({ tier, collectionId }: { tier: GoalTier; collectionId: string }) {
  useMountEffect(() => {
    if (collectionId === "all") goalCaughtUp(tier);
  });
  return null;
}

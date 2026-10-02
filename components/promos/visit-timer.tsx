"use client";

import { markPromoVisitAction } from "@/app/(private)/actions";
import { useMountEffect } from "@/hooks/use-mount-effect";

/** Long enough that a bounce or a prefetch doesn't count as a visit. */
const VISIT_DELAY_MS = 3000;

export function VisitTimer({ target }: { target: string }) {
  useMountEffect(() => {
    const timer = setTimeout(() => void markPromoVisitAction(target), VISIT_DELAY_MS);
    return () => clearTimeout(timer);
  });
  return null;
}

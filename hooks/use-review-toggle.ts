"use client";

import { useState } from "react";
import { toggleActiveForReview } from "@/app/(private)/jargon/actions";
import { useToast } from "@/components/ui/toast";

/** Pauses or resumes a collection for Read, Review and Quiz.
 *  `onLocalChange` applies the change optimistically and is called again
 *  with the old value if the save fails. */
export function useReviewToggle(onLocalChange?: (domainId: string, active: boolean) => void) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { toast } = useToast();

  async function setActiveForReview(domainId: string, active: boolean): Promise<boolean> {
    setPendingId(domainId);
    onLocalChange?.(domainId, active);
    const { error } = await toggleActiveForReview(domainId, active);
    setPendingId(null);

    if (error) {
      onLocalChange?.(domainId, !active);
      toast(error, "destructive");
      return false;
    }
    return true;
  }

  return { setActiveForReview, pendingId };
}

"use client";

import { useState } from "react";
import { toggleActiveForReview } from "@/app/(private)/app/actions";
import { useToast } from "@/components/ui/toast";

/** Pauses or resumes a collection for Read, Review and Quiz.
 *  `onLocalChange` applies the change optimistically and is called again
 *  with the old value if the save fails. */
export function useReviewToggle(onLocalChange?: (collectionId: string, active: boolean) => void) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { toast } = useToast();

  async function setActiveForReview(collectionId: string, active: boolean): Promise<boolean> {
    setPendingId(collectionId);
    onLocalChange?.(collectionId, active);
    const { error } = await toggleActiveForReview(collectionId, active);
    setPendingId(null);

    if (error) {
      onLocalChange?.(collectionId, !active);
      toast(error, "destructive");
      return false;
    }
    return true;
  }

  return { setActiveForReview, pendingId };
}

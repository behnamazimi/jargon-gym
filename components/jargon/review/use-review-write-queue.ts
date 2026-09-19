import { useRef, useState } from "react";
import { rateReviewTermAction } from "@/app/(private)/jargon/review/actions";
import { revalidateStudyPathsAction } from "@/app/(private)/jargon/actions";
import { useToast } from "@/components/ui/toast";
import { useTraceWriteQueue } from "@/lib/study/trace-write-queue";
import { upsertPendingWrite } from "@/lib/review/writes";
import {
  loadPendingReviewWrites,
  mergePendingWrites,
  savePendingReviewWrites,
  takeLegacyReviewSessionWrites,
} from "@/lib/review/pending-writes";
import type { PendingReviewWrite } from "@/lib/review/types";
import type { ReviewGrade } from "@/lib/trace";
import { useMountEffect } from "@/hooks/use-mount-effect";

/** Owns the background TRACE write queue for Review: enqueues a grade,
 *  retries/toasts on failure, and keeps unconfirmed writes in a slim
 *  localStorage key so a refresh can replay them. */
export function useReviewWriteQueue(options: {
  setErrorMessage: (message: string | null) => void;
}) {
  const [, setPendingWrites] = useState<PendingReviewWrite[]>([]);
  const { toast } = useToast();
  const queue = useTraceWriteQueue();
  const flushedOnMountRef = useRef(false);

  function persistWrites(writes: PendingReviewWrite[]) {
    setPendingWrites(writes);
    savePendingReviewWrites(writes);
  }

  function enqueueRating(
    termId: string,
    grade: ReviewGrade,
    existing?: PendingReviewWrite,
  ): PendingReviewWrite {
    const write = existing ?? { id: crypto.randomUUID(), termId, grade };
    if (!existing) {
      setPendingWrites((prev) => {
        const next = upsertPendingWrite(prev, write);
        savePendingReviewWrites(next);
        return next;
      });
    }

    queue.enqueue({
      id: write.id,
      label: `review:${termId}`,
      run: () => rateReviewTermAction(termId, grade),
      onSettled: (result, outcome) => {
        if (outcome === "success") {
          setPendingWrites((prev) => {
            const next = prev.filter((w) => w.id !== write.id);
            savePendingReviewWrites(next);
            return next;
          });
          void revalidateStudyPathsAction("review");
        }
        if (result.error) {
          options.setErrorMessage(result.error);
        }
        if (outcome === "exhausted") {
          toast("Couldn't save a rating. Return to Review to retry.", "destructive");
        }
      },
    });

    return write;
  }

  function flushPendingWrites(writes: PendingReviewWrite[]) {
    for (const write of writes) {
      enqueueRating(write.termId, write.grade, write);
    }
  }

  useMountEffect(() => {
    if (flushedOnMountRef.current) return;
    flushedOnMountRef.current = true;
    const recovered = mergePendingWrites(
      takeLegacyReviewSessionWrites(),
      loadPendingReviewWrites(),
    );
    if (recovered.length === 0) return;
    persistWrites(recovered);
    flushPendingWrites(recovered);
  });

  return {
    enqueueRating,
  };
}

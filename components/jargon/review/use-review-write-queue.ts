import { useRef, useState } from "react";
import { rateReviewTermAction } from "@/app/(private)/jargon/review/actions";
import { useToast } from "@/components/ui/toast";
import { useTraceWriteQueue } from "@/lib/study/trace-write-queue";
import { upsertPendingWrite } from "@/components/jargon/review/review-session-actions";
import type { PendingReviewWrite } from "@/lib/review/types";
import type { ReviewGrade } from "@/lib/trace";

/** Owns the background TRACE write queue for one Review session: enqueues
 *  a grade, retries/toasts on failure, tracks unconfirmed writes for
 *  crash-recovery replay, and reports when it's safe to clear session
 *  storage (queue idle, session already marked complete). */
export function useReviewWriteQueue(options: {
  setErrorMessage: (message: string | null) => void;
  onSessionIdleAfterComplete: () => void;
}) {
  const [pendingWrites, setPendingWrites] = useState<PendingReviewWrite[]>([]);
  const { toast } = useToast();
  const queue = useTraceWriteQueue();
  const sessionCompleteRef = useRef(false);

  function checkIdle() {
    if (sessionCompleteRef.current && queue.getState().isIdle) {
      options.onSessionIdleAfterComplete();
    }
  }

  function enqueueRating(termId: string, grade: ReviewGrade) {
    const write: PendingReviewWrite = { id: crypto.randomUUID(), termId, grade };
    setPendingWrites((prev) => upsertPendingWrite(prev, write));

    queue.enqueue({
      label: `review:${termId}`,
      run: () => rateReviewTermAction(termId, grade),
      onSettled: (result, outcome) => {
        if (outcome === "success") {
          setPendingWrites((prev) => prev.filter((w) => w.id !== write.id));
        }
        if (result.error) {
          options.setErrorMessage(result.error);
        }
        if (outcome === "exhausted") {
          toast("Couldn't save a rating. We'll keep trying.", "destructive");
        }
        checkIdle();
      },
    });
  }

  function markComplete() {
    sessionCompleteRef.current = true;
    checkIdle();
  }

  function resetSession() {
    sessionCompleteRef.current = false;
  }

  return {
    pendingWrites,
    setPendingWrites,
    enqueueRating,
    markComplete,
    resetSession,
  };
}

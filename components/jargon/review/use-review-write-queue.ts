import { useRef, useState } from "react";
import { rateReviewTermAction } from "@/app/(private)/jargon/review/actions";
import { useToast } from "@/components/ui/toast";
import { hasInflightTraceWrites, useTraceWriteQueue } from "@/lib/study/trace-write-queue";
import { upsertPendingWrite } from "@/components/jargon/review/review-session-actions";
import { dropPendingReviewWrite } from "@/lib/review/session-storage";
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
    if (sessionCompleteRef.current && queue.getState().isIdle && !hasInflightTraceWrites()) {
      options.onSessionIdleAfterComplete();
    }
  }

  function enqueueRating(termId: string, grade: ReviewGrade, existing?: PendingReviewWrite) {
    const write = existing ?? { id: crypto.randomUUID(), termId, grade };
    if (!existing) {
      setPendingWrites((prev) => upsertPendingWrite(prev, write));
    }

    queue.enqueue({
      id: write.id,
      label: `review:${termId}`,
      run: () => rateReviewTermAction(termId, grade),
      onSettled: (result, outcome) => {
        if (outcome === "success") {
          setPendingWrites((prev) => prev.filter((w) => w.id !== write.id));
          dropPendingReviewWrite(write.id);
        }
        if (result.error) {
          options.setErrorMessage(result.error);
        }
        if (outcome === "exhausted") {
          toast("Couldn't save a rating. Return to Review to retry.", "destructive");
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

  /** Re-enqueues every write an abandoned session never got to confirm —
   *  call this before discarding or replacing a saved session (resume,
   *  discard, or starting a fresh one), so a grade the user already tapped
   *  still gets a shot at reaching the server instead of being silently
   *  dropped along with the session it was recorded against. Reuses the
   *  stored write id so a queue that's still draining after unmount isn't
   *  duplicated. */
  function flushPendingWrites(writes: PendingReviewWrite[]) {
    for (const write of writes) {
      enqueueRating(write.termId, write.grade, write);
    }
  }

  return {
    pendingWrites,
    setPendingWrites,
    enqueueRating,
    flushPendingWrites,
    markComplete,
    resetSession,
  };
}

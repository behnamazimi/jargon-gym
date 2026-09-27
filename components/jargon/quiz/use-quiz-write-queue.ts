import { useRef, useState } from "react";
import { recordQuizAnswerAction } from "@/app/(private)/jargon/quiz/actions";
import { useToast } from "@/components/ui/toast";
import { hasInflightTraceWrites, useTraceWriteQueue } from "@/lib/study/trace-write-queue";
import { dropPendingQuizWrite, type PendingQuizWrite } from "@/lib/quiz/session-storage";

/** Owns the background TRACE write queue for one Quiz session: enqueues
 *  an answer, retries/toasts on failure, tracks unconfirmed writes for
 *  crash-recovery replay, and reports when it's safe to clear session
 *  storage (queue idle, session already marked complete). */
export function useQuizWriteQueue(options: {
  setErrorMessage: (message: string | null) => void;
  onSessionIdleAfterComplete: () => void;
  /** A finished session was replaced (e.g. "Quiz again") while its
   *  answers were still saving; called once those writes land. */
  onReplacedSessionIdle: () => void;
}) {
  const [pendingWrites, setPendingWrites] = useState<PendingQuizWrite[]>([]);
  const { toast } = useToast();
  const queue = useTraceWriteQueue();
  const sessionCompleteRef = useRef(false);
  const replacedSessionPendingRef = useRef(false);

  function isIdle() {
    return queue.getState().isIdle && !hasInflightTraceWrites();
  }

  function checkIdle() {
    if (!isIdle()) return;
    if (replacedSessionPendingRef.current) {
      replacedSessionPendingRef.current = false;
      options.onReplacedSessionIdle();
    }
    if (sessionCompleteRef.current) options.onSessionIdleAfterComplete();
  }

  /** Shared by a fresh submit and by resume-replay, so both paths
   *  retry/toast/clean up pendingWrites identically. */
  function enqueueAnswerWrite(write: PendingQuizWrite) {
    queue.enqueue({
      id: write.id,
      label: `quiz:${write.termId}`,
      run: () =>
        recordQuizAnswerAction({
          termId: write.termId,
          passed: write.passed,
          questionType: write.questionType,
        }),
      onSettled: (result, outcome) => {
        if (outcome === "success") {
          setPendingWrites((prev) => prev.filter((w) => w.id !== write.id));
          dropPendingQuizWrite(write.id);
        }
        if (result.error) {
          options.setErrorMessage(result.error);
        }
        if (outcome === "exhausted") {
          toast("Couldn't save an answer. Return to Quiz to retry.", "destructive");
        }
        checkIdle();
      },
    });
  }

  function markSessionComplete() {
    sessionCompleteRef.current = true;
    checkIdle();
  }

  function resetSession() {
    // Without this, a finished quiz replaced before its writes drain would
    // never trigger its page revalidation.
    if (sessionCompleteRef.current && !isIdle()) replacedSessionPendingRef.current = true;
    sessionCompleteRef.current = false;
  }

  /** Re-enqueues every write an abandoned session never got to confirm —
   *  call this before discarding or replacing a saved session (resume,
   *  discard, or starting a fresh one), so an answer the user already
   *  submitted still gets a shot at reaching the server instead of being
   *  silently dropped along with the session it was recorded against.
   *  Reuses the stored write id so a queue that's still draining after
   *  unmount isn't duplicated. */
  function flushPendingWrites(writes: PendingQuizWrite[]) {
    for (const write of writes) {
      enqueueAnswerWrite(write);
    }
  }

  return {
    pendingWrites,
    setPendingWrites,
    enqueueAnswerWrite,
    flushPendingWrites,
    markSessionComplete,
    resetSession,
  };
}

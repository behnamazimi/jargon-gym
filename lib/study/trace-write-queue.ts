"use client";

import { useEffect, useRef } from "react";

type QueueTaskResult = { error?: string };

type TraceWriteTask<T extends QueueTaskResult> = {
  /** For error logging only — not shown to the user. */
  label: string;
  /**
   * Dedupes a write that's already draining on an unmounted queue so
   * resume/discard/start cannot enqueue a second copy of the same job.
   */
  id?: string;
  run: () => Promise<T>;
  onSettled: (result: T, outcome: "success" | "exhausted") => void;
};

type TraceWriteQueueState = {
  isIdle: boolean;
  pendingCount: number;
};

export type TraceWriteQueue = {
  enqueue: <T extends QueueTaskResult>(task: TraceWriteTask<T>) => void;
  /** Snapshot, checked synchronously right after a session is marked
   *  complete and again inside each write's onSettled — that combination
   *  covers every idle transition without needing a subscription. */
  getState: () => TraceWriteQueueState;
  destroy: () => void;
};

/** 1 initial attempt + retries at these backoffs before a write is
 *  considered exhausted (~11s worst case). */
export const TRACE_WRITE_RETRY_DELAYS_MS = [1000, 3000, 7000];

/** Write ids currently queued or in flight across every queue instance —
 *  needed because unmount drains the old queue while a remount creates a
 *  new one, and flush would otherwise duplicate the same TRACE write. */
const inflightTaskIds = new Set<string>();

export function hasInflightTraceWrites(): boolean {
  return inflightTaskIds.size > 0;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Strictly sequential FIFO: task N+1 never starts until task N has
 *  either succeeded or exhausted its retries. This is what guarantees
 *  overlapping TRACE read-modify-write calls can never happen, regardless
 *  of whether two tasks touch the same term. A failed-and-exhausted task
 *  still lets the queue advance — one stuck write must not stall the rest.
 *
 *  `destroy()` drains: it stops new enqueues but already-queued and
 *  in-flight jobs still run to `onSettled`. Aborting after a successful
 *  `run()` would skip that callback, leave the write in session storage,
 *  and replay it on resume — a duplicate `applyReviewGrade` / `applyQuizAnswer`. */
export function createTraceWriteQueue(): TraceWriteQueue {
  let queue: (() => Promise<void>)[] = [];
  let running = false;
  let accepting = true;
  let pendingCount = 0;

  function getState(): TraceWriteQueueState {
    // pendingCount (not `running`) is the correct idle signal: it's
    // decremented in the same synchronous step as onSettled, so a task's
    // own onSettled callback sees isIdle correctly for the last item.
    // `running` only flips back to false after that task's promise
    // returns to pump()'s await, which is one tick too late.
    return { isIdle: pendingCount === 0, pendingCount };
  }

  async function pump() {
    if (running) return;
    running = true;
    while (queue.length > 0) {
      const job = queue.shift();
      if (!job) break;
      await job();
    }
    running = false;
  }

  function enqueue<T extends QueueTaskResult>(task: TraceWriteTask<T>) {
    if (!accepting) return;
    if (task.id && inflightTaskIds.has(task.id)) return;
    if (task.id) inflightTaskIds.add(task.id);
    pendingCount++;
    queue.push(async () => {
      for (let attempt = 0; attempt <= TRACE_WRITE_RETRY_DELAYS_MS.length; attempt++) {
        let result: T;
        try {
          result = await task.run();
        } catch (err) {
          result = { error: err instanceof Error ? err.message : "Unknown error" } as T;
        }
        if (!result.error) {
          pendingCount--;
          if (task.id) inflightTaskIds.delete(task.id);
          task.onSettled(result, "success");
          return;
        }
        if (attempt < TRACE_WRITE_RETRY_DELAYS_MS.length) {
          await wait(TRACE_WRITE_RETRY_DELAYS_MS[attempt]);
          continue;
        }
        console.error(`trace-write-queue: exhausted retries for ${task.label}`, result.error);
        pendingCount--;
        if (task.id) inflightTaskIds.delete(task.id);
        task.onSettled(result, "exhausted");
        return;
      }
    });
    void pump();
  }

  function destroy() {
    accepting = false;
  }

  return { enqueue, getState, destroy };
}

/** Owns a `TraceWriteQueue` for the lifetime of the mounted component —
 *  one per Review/Quiz session hook, not a module-level singleton, since a
 *  user is only ever on one of those routes at a time. Unmount drains the
 *  queue instead of aborting it so in-flight TRACE writes still settle. */
export function useTraceWriteQueue(): TraceWriteQueue {
  const queueRef = useRef<TraceWriteQueue | null>(null);
  if (!queueRef.current) {
    queueRef.current = createTraceWriteQueue();
  }

  useEffect(() => {
    const queue = queueRef.current;
    return () => queue?.destroy();
  }, []);

  return queueRef.current;
}

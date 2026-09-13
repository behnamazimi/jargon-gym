import { describe, expect, it, vi } from "vitest";
import {
  TRACE_WRITE_RETRY_DELAYS_MS,
  createTraceWriteQueue,
  hasInflightTraceWrites,
} from "./trace-write-queue";

function deferred<T>(value: T): { promise: Promise<T>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<T>((res) => {
    resolve = () => res(value);
  });
  return { promise, resolve };
}

describe("createTraceWriteQueue", () => {
  it("does not start task N+1 until task N finishes", async () => {
    const queue = createTraceWriteQueue();
    const order: string[] = [];
    const first = deferred<{ error?: string }>({});

    queue.enqueue({
      label: "first",
      run: () => {
        order.push("first-start");
        return first.promise;
      },
      onSettled: () => {
        order.push("first-settled");
      },
    });
    queue.enqueue({
      label: "second",
      run: async () => {
        order.push("second-start");
        return {};
      },
      onSettled: () => {
        order.push("second-settled");
      },
    });

    await Promise.resolve();
    expect(order).toEqual(["first-start"]);

    first.resolve();
    await vi.waitFor(() => {
      expect(order).toEqual(["first-start", "first-settled", "second-start", "second-settled"]);
    });
  });

  it("still advances after a task exhausts its retries", async () => {
    vi.useFakeTimers();
    try {
      const queue = createTraceWriteQueue();
      const order: string[] = [];

      queue.enqueue({
        label: "fail",
        run: async () => ({ error: "nope" }),
        onSettled: (_result, outcome) => {
          order.push(`fail-${outcome}`);
        },
      });
      queue.enqueue({
        label: "ok",
        run: async () => {
          order.push("ok-start");
          return {};
        },
        onSettled: () => {
          order.push("ok-settled");
        },
      });

      await vi.runAllTimersAsync();
      expect(order).toEqual(["fail-exhausted", "ok-start", "ok-settled"]);
      expect(TRACE_WRITE_RETRY_DELAYS_MS).toEqual([1000, 3000, 7000]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("delivers onSettled success for an in-flight job after drain", async () => {
    const queue = createTraceWriteQueue();
    const first = deferred<{ error?: string }>({});
    let outcome: string | null = null;

    queue.enqueue({
      label: "in-flight",
      run: () => first.promise,
      onSettled: (_result, next) => {
        outcome = next;
      },
    });

    await Promise.resolve();
    queue.destroy();
    first.resolve();
    await vi.waitFor(() => {
      expect(outcome).toBe("success");
      expect(queue.getState().isIdle).toBe(true);
    });
  });

  it("ignores enqueue after drain", async () => {
    const queue = createTraceWriteQueue();
    queue.destroy();

    let ran = false;
    queue.enqueue({
      label: "too-late",
      run: async () => {
        ran = true;
        return {};
      },
      onSettled: () => {},
    });

    await Promise.resolve();
    expect(ran).toBe(false);
    expect(queue.getState().pendingCount).toBe(0);
  });

  it("does not enqueue a write id that is already in flight", async () => {
    const queue = createTraceWriteQueue();
    const first = deferred<{ error?: string }>({});
    let runs = 0;
    let settled = 0;

    queue.enqueue({
      id: "same-write",
      label: "first",
      run: () => {
        runs++;
        return first.promise;
      },
      onSettled: () => {
        settled++;
      },
    });
    queue.enqueue({
      id: "same-write",
      label: "duplicate",
      run: async () => {
        runs++;
        return {};
      },
      onSettled: () => {
        settled++;
      },
    });

    await Promise.resolve();
    expect(runs).toBe(1);
    expect(hasInflightTraceWrites()).toBe(true);

    first.resolve();
    await vi.waitFor(() => {
      expect(runs).toBe(1);
      expect(settled).toBe(1);
      expect(hasInflightTraceWrites()).toBe(false);
    });
  });

  it("dedupes a draining write against a new queue instance", async () => {
    const draining = createTraceWriteQueue();
    const first = deferred<{ error?: string }>({});
    let runs = 0;

    draining.enqueue({
      id: "across-queues",
      label: "original",
      run: () => {
        runs++;
        return first.promise;
      },
      onSettled: () => {},
    });
    draining.destroy();

    const remounted = createTraceWriteQueue();
    remounted.enqueue({
      id: "across-queues",
      label: "flush",
      run: async () => {
        runs++;
        return {};
      },
      onSettled: () => {},
    });

    await Promise.resolve();
    expect(runs).toBe(1);

    first.resolve();
    await vi.waitFor(() => {
      expect(runs).toBe(1);
      expect(hasInflightTraceWrites()).toBe(false);
    });
  });
});

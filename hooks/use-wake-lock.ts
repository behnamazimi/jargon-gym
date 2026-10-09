"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useMediaQuery } from "@/hooks/use-platform";
import { PLATFORM_MEDIA } from "@/lib/platform";

/** How long the screen stays on without a tap or key press. */
export const IDLE_WAKE_MS = 2 * 60_000;

const subscribeToNothing = () => () => {};

/** Whether "Keep screen awake" applies here: a touch device whose browser can hold the screen on. */
export function useKeepAwakeAvailable(): boolean {
  const supported = useSyncExternalStore(
    subscribeToNothing,
    () => "wakeLock" in navigator,
    () => false,
  );
  const touch = useMediaQuery(PLATFORM_MEDIA.coarsePointer, false);
  return supported && touch;
}

/** Keeps the screen from sleeping while `active` is true, using the Screen
 *  Wake Lock API. No-ops silently when unsupported (e.g. older Safari) or
 *  when the request is rejected — this is a nice-to-have, never something
 *  the caller should have to handle failure for.
 *
 *  The OS releases a wake lock automatically whenever the tab/document goes
 *  hidden (backgrounded, screen manually locked, app switched away from),
 *  so it must be re-requested on the next `visibilitychange` back to
 *  visible — otherwise the screen would stay awake only until the first
 *  such interruption instead of for the whole time `active` is true.
 *
 *  With `idleMs`, the lock is let go after that long without a pointer press
 *  or key press, and taken again on the next one. Input only stamps a ref and
 *  one timer checks it, so nothing re-renders or resets per event. */
export function useWakeLock(active: boolean, { idleMs }: { idleMs?: number } = {}): void {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;

    let cancelled = false;
    let idle = false;
    let lastActivity = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function acquire() {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled || idle) {
          void lock.release();
          return;
        }
        lockRef.current = lock;
        // The OS releases it when the page is hidden; forget it so it can be requested again.
        lock.addEventListener("release", () => {
          if (lockRef.current === lock) lockRef.current = null;
        });
      } catch {
        // Unsupported, denied, or the page went hidden again before the
        // request resolved — nothing to do, screen just won't be held awake.
      }
    }

    function armIdleTimer(delay: number) {
      timer = setTimeout(() => {
        const remaining = idleMs! - (performance.now() - lastActivity);
        if (remaining > 0) {
          armIdleTimer(remaining);
          return;
        }
        idle = true;
        void lockRef.current?.release();
        lockRef.current = null;
      }, delay);
    }

    function handleActivity() {
      lastActivity = performance.now();
      if (!idle) return;
      idle = false;
      armIdleTimer(idleMs!);
      if (document.visibilityState === "visible") void acquire();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && !lockRef.current && !idle) {
        void acquire();
      }
    }

    void acquire();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    if (idleMs !== undefined) {
      armIdleTimer(idleMs);
      document.addEventListener("pointerdown", handleActivity, { passive: true, capture: true });
      document.addEventListener("keydown", handleActivity, { passive: true, capture: true });
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("pointerdown", handleActivity, { capture: true });
      document.removeEventListener("keydown", handleActivity, { capture: true });
      void lockRef.current?.release();
      lockRef.current = null;
    };
  }, [active, idleMs]);
}

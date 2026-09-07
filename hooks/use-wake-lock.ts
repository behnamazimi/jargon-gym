"use client";

import { useEffect, useRef } from "react";

/** Keeps the screen from sleeping while `active` is true, using the Screen
 *  Wake Lock API. No-ops silently when unsupported (e.g. older Safari) or
 *  when the request is rejected — this is a nice-to-have, never something
 *  the caller should have to handle failure for.
 *
 *  The OS releases a wake lock automatically whenever the tab/document goes
 *  hidden (backgrounded, screen manually locked, app switched away from),
 *  so it must be re-requested on the next `visibilitychange` back to
 *  visible — otherwise the screen would stay awake only until the first
 *  such interruption instead of for the whole time `active` is true. */
export function useWakeLock(active: boolean): void {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;

    let cancelled = false;

    async function acquire() {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void lock.release();
          return;
        }
        lockRef.current = lock;
      } catch {
        // Unsupported, denied, or the page went hidden again before the
        // request resolved — nothing to do, screen just won't be held awake.
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && !lockRef.current) {
        void acquire();
      }
    }

    void acquire();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void lockRef.current?.release();
      lockRef.current = null;
    };
  }, [active]);
}

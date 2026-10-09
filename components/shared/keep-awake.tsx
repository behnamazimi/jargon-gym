"use client";

import { IDLE_WAKE_MS, useKeepAwakeAvailable, useWakeLock } from "@/hooks/use-wake-lock";

/** Holds the screen on while mounted and `enabled`, until the person goes idle. */
export function KeepAwake({ enabled }: { enabled: boolean }) {
  const available = useKeepAwakeAvailable();
  useWakeLock(enabled && available, { idleMs: IDLE_WAKE_MS });
  return null;
}

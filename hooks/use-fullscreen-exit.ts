"use client";

import { useEffect, useRef } from "react";

type FullscreenDocumentElement = HTMLElement & {
  requestFullscreen?: () => Promise<void>;
};

const HISTORY_MARKER = { readFullscreen: true } as const;

function hasFullscreenMarker(state: unknown): boolean {
  return Boolean((state as { readFullscreen?: boolean } | null)?.readFullscreen);
}

/** Enters real fullscreen on the whole document. Must be called
 *  synchronously inside the click handler that triggers focus mode —
 *  browsers require the Fullscreen API call to happen within the same call
 *  stack as the user gesture, so it can't be deferred into an effect that
 *  runs after the state update commits (that would silently lose the
 *  gesture and fall back to the CSS overlay even for a direct click).
 *  Fails silently (falling back to the CSS overlay `useFullscreenExit`'s
 *  caller renders) when unsupported or rejected — notably iOS Safari,
 *  which has no reliable Fullscreen API for regular page content. */
export function requestFullscreenOnDocument(): void {
  const el = document.documentElement as FullscreenDocumentElement;
  if (typeof el.requestFullscreen !== "function") return;
  el.requestFullscreen().catch(() => {});
}

/** Normalizes every way focus mode can end — the OS/browser's own chrome,
 *  Esc, and the browser back button — into a single `onExitedExternally`
 *  callback fired at most once, and exits real fullscreen (if entered via
 *  `requestFullscreenOnDocument`) on unmount.
 *
 *  A history entry is pushed on entry so the back button closes focus mode
 *  instead of navigating away (this is a same-URL toggle, not a real
 *  route); the exit paths we drive ourselves (Esc, an unprompted
 *  `fullscreenchange`) pop it back off via history.back() so a subsequent
 *  real back-button press doesn't land on a dangling no-op entry. That
 *  push/pop is guarded by a ref rather than done in the effect's own
 *  cleanup, since React 18 StrictMode double-invokes effects in
 *  development (mount → cleanup → mount) and a cleanup-driven
 *  history.back() would fire on that simulated unmount too, not just a
 *  real one. */
export function useFullscreenExit(
  active: boolean,
  onExitedExternally: () => void,
): { requestExit: () => void } {
  const hasPushedHistoryRef = useRef(false);
  const exitedRef = useRef(false);
  const exitRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!active) return;

    exitedRef.current = false;

    function exit() {
      if (exitedRef.current) return;
      exitedRef.current = true;
      if (hasPushedHistoryRef.current && hasFullscreenMarker(window.history.state)) {
        hasPushedHistoryRef.current = false;
        window.history.back();
      }
      onExitedExternally();
    }
    exitRef.current = exit;

    // A real back-button press during native fullscreen can also make the
    // browser auto-exit fullscreen as part of that same navigation, and
    // browsers don't guarantee whether `fullscreenchange` or `popstate`
    // fires first. Deferring this check lets an already-in-flight
    // `popstate` for that same back-press land first and clear our marker
    // (via handlePopState below) — so by the time this runs, `exit()`
    // either no-ops (exitedRef already set) or correctly sees no marker
    // left to pop, instead of calling history.back() a second time on top
    // of the browser's own back navigation.
    function handleFullscreenChange() {
      if (document.fullscreenElement === document.documentElement) return;
      setTimeout(exit, 0);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") exit();
    }

    // A real back-button press pops our pushed entry itself; if the state
    // we land on no longer carries our marker, treat it as the exit signal
    // (don't call history.back() again — the browser already navigated).
    function handlePopState() {
      if (!hasFullscreenMarker(window.history.state)) {
        hasPushedHistoryRef.current = false;
        if (!exitedRef.current) {
          exitedRef.current = true;
          onExitedExternally();
        }
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", handlePopState);

    if (!hasPushedHistoryRef.current) {
      window.history.pushState(HISTORY_MARKER, "", window.location.href);
      hasPushedHistoryRef.current = true;
    }

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", handlePopState);
      if (document.fullscreenElement === document.documentElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
    // onExitedExternally is taken as given at effect-setup time; re-running
    // this on every parent render would re-push history.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return {
    requestExit: () => exitRef.current(),
  };
}

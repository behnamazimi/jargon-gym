"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

type FullscreenMode = "native" | "overlay-fallback";

type FullscreenElement = HTMLElement & {
  requestFullscreen?: () => Promise<void>;
};

const HISTORY_MARKER = { readFullscreen: true } as const;

function hasFullscreenMarker(state: unknown): boolean {
  return Boolean((state as { readFullscreen?: boolean } | null)?.readFullscreen);
}

/** Drives the real Fullscreen API on `ref` while `active` is true, falling
 *  back to `"overlay-fallback"` (a plain full-viewport CSS overlay, driven
 *  by the caller's own styling) whenever requestFullscreen is unsupported
 *  or fails — notably iOS Safari, which has no reliable Fullscreen API for
 *  regular page content.
 *
 *  Also normalizes every way fullscreen can end — the OS/browser's own
 *  chrome, Esc, and the browser back button — into a single
 *  `onExitedExternally` callback fired at most once.
 *
 *  A history entry is pushed on entry so the back button closes fullscreen
 *  instead of navigating away (this is a same-URL toggle, not a real
 *  route); the exit paths we drive ourselves (Esc, `fullscreenchange`) pop
 *  it back off via history.back() so a subsequent real back-button press
 *  doesn't land on a dangling no-op entry. That push/pop is guarded by a
 *  ref rather than done in the effect's own cleanup, since React 18
 *  StrictMode double-invokes effects in development (mount → cleanup →
 *  mount) and a cleanup-driven history.back() would fire on that
 *  simulated unmount too, not just a real one. */
export type FullscreenController = {
  mode: FullscreenMode;
  /** Call this for any exit control the caller renders itself (a pinned
   *  exit icon, an "exit focus mode" button in an error/end state) so it
   *  gets the same history cleanup as Esc/browser-back. */
  requestExit: () => void;
};

export function useFullscreenElement(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onExitedExternally: () => void,
): FullscreenController {
  const [mode, setMode] = useState<FullscreenMode>("overlay-fallback");
  const hasPushedHistoryRef = useRef(false);
  const exitedRef = useRef(false);
  const exitRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!active) return;
    const el = ref.current as FullscreenElement | null;
    if (!el) return;

    let cancelled = false;
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

    function handleFullscreenChange() {
      if (document.fullscreenElement !== el) exit();
    }

    function handleFullscreenError() {
      setMode("overlay-fallback");
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
    document.addEventListener("fullscreenerror", handleFullscreenError);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", handlePopState);

    if (!hasPushedHistoryRef.current) {
      window.history.pushState(HISTORY_MARKER, "", window.location.href);
      hasPushedHistoryRef.current = true;
    }

    if (typeof el.requestFullscreen === "function") {
      try {
        // Some browsers reject the returned promise on failure (no gesture,
        // iOS Safari, etc.); others throw synchronously instead of
        // returning a promise at all — both must fall back the same way.
        Promise.resolve(el.requestFullscreen())
          .then(() => {
            if (!cancelled) setMode("native");
          })
          .catch(() => {
            if (!cancelled) setMode("overlay-fallback");
          });
      } catch {
        setMode("overlay-fallback");
      }
    } else {
      setMode("overlay-fallback");
    }

    return () => {
      cancelled = true;
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("fullscreenerror", handleFullscreenError);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", handlePopState);
      if (document.fullscreenElement === el) {
        document.exitFullscreen().catch(() => {});
      }
    };
    // onExitedExternally is taken as given at effect-setup time; re-running
    // this on every parent render would re-push history and re-request
    // fullscreen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ref]);

  return {
    mode,
    requestExit: () => exitRef.current(),
  };
}

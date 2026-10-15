"use client";

import { useEffect } from "react";
import { parseAuthDeepLink } from "@/lib/native/auth-deep-link";
import { isNativeShell } from "@/lib/native/shell";

/** In the native app, finishes Google sign-in when the system browser hands control back. */
export function NativeAuthBridge() {
  useEffect(() => {
    if (!isNativeShell()) return;

    let cancelled = false;
    let removeListener: (() => Promise<void>) | undefined;

    void (async () => {
      const [{ App }, { Browser }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/browser"),
      ]);
      const handle = await App.addListener("appUrlOpen", ({ url }) => {
        const path = parseAuthDeepLink(url);
        if (!path) return;
        void Browser.close().catch(() => {});
        window.location.assign(path);
      });
      if (cancelled) {
        await handle.remove();
        return;
      }
      removeListener = handle.remove;
    })();

    return () => {
      cancelled = true;
      void removeListener?.();
    };
  }, []);

  return null;
}

"use client";

import { useEffect } from "react";
import { isNativeShell } from "@/lib/native/shell";

/** In the native app, keeps the splash screen up until the page has painted. The app's own
 *  `launchShowDuration` hides it anyway if the page is slow. */
export function NativeSplash() {
  useEffect(() => {
    if (!isNativeShell()) return;

    const frame = requestAnimationFrame(() => {
      void import("@capacitor/splash-screen")
        .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 200 }))
        .catch(() => {});
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return null;
}

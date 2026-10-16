"use client";

import { useEffect } from "react";
import { isNativeShell } from "@/lib/native/shell";
import { DARK_THEME } from "@/lib/theme";

/** In the native app, matches the status bar icons to the page theme, which can differ from the phone's. */
export function NativeSystemBars() {
  useEffect(() => {
    if (!isNativeShell()) return;

    const root = document.documentElement;
    let cancelled = false;

    const apply = async () => {
      const { SystemBars, SystemBarsStyle } = await import("@capacitor/core");
      if (cancelled) return;
      const isDark = root.getAttribute("data-theme") === DARK_THEME;
      // The style names describe the bar's background: Light means dark icons.
      await SystemBars.setStyle({
        style: isDark ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
      });
    };

    const applySafely = () => void apply().catch(() => {});
    applySafely();
    const observer = new MutationObserver(applySafely);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  return null;
}

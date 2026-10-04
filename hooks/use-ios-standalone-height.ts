"use client";

import { useMountEffect } from "@/hooks/use-mount-effect";

/**
 * iOS home-screen apps often report a layout viewport shorter than the screen
 * (it differs between page loads and client navigations), so anything pinned
 * to the bottom floats above the edge. In portrait the screen height is the
 * reliable number, so publish it as --app-height for the phone shell.
 */
export function useIosStandaloneHeight() {
  useMountEffect(() => {
    const isIosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!isIosStandalone) return;

    const root = document.documentElement;
    const update = () => {
      const portrait = window.matchMedia("(orientation: portrait)").matches;
      const height = portrait ? Math.max(screen.height, screen.width) : window.innerHeight;
      root.style.setProperty("--app-height", `${height}px`);
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") update();
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.addEventListener("pageshow", update);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("pageshow", update);
      document.removeEventListener("visibilitychange", onVisible);
      root.style.removeProperty("--app-height");
    };
  });
}

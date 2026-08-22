/**
 * Single source of truth for platform detection.
 *
 * CSS `@custom-variant` aliases in `app/globals.css` must use the same
 * media strings as `PLATFORM_MEDIA` below. Form factor is Tailwind `md`
 * (768px): phone is `max-md` / `PLATFORM_MEDIA.phone`.
 *
 * Layout chrome stays CSS-first (`max-md:`, `standalone:`, `coarse:`).
 * This module is for JS that CSS cannot express (install, iOS copy, live
 * display-mode, placeholder text).
 */

/** Canonical form-factor breakpoint. Must match Tailwind `md`. */
export const PLATFORM_MD_MIN_PX = 768;

export const PLATFORM_MEDIA = {
  phone: `(max-width: ${PLATFORM_MD_MIN_PX - 1}px)`,
  standalone: "(display-mode: standalone)",
  coarsePointer: "(pointer: coarse)",
  reducedMotion: "(prefers-reduced-motion: reduce)",
} as const;

type FormFactor = "phone" | "desktop";
type DisplayMode = "browser" | "standalone";
type PointerKind = "coarse" | "fine";

export type PlatformSnapshot = {
  formFactor: FormFactor;
  displayMode: DisplayMode;
  pointer: PointerKind;
  isIos: boolean;
  prefersReducedMotion: boolean;
};

type IosDeviceInput = {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  hasMSStream: boolean;
};

/** Safe defaults for SSR / first client paint. Layout does not depend on these. */
export const SSR_PLATFORM: PlatformSnapshot = {
  formFactor: "desktop",
  displayMode: "browser",
  pointer: "fine",
  isIos: false,
  prefersReducedMotion: false,
};

export function isIosDevice(input: IosDeviceInput): boolean {
  const iOS = /iPad|iPhone|iPod/.test(input.userAgent) && !input.hasMSStream;
  const iPadOs = input.platform === "MacIntel" && input.maxTouchPoints > 1;
  return iOS || iPadOs;
}

function iosDeviceInputFromNavigator(
  nav: Navigator = navigator,
  win: Window = window,
): IosDeviceInput {
  return {
    userAgent: nav.userAgent,
    platform: nav.platform,
    maxTouchPoints: nav.maxTouchPoints,
    hasMSStream: "MSStream" in win,
  };
}

function isIosStandalone(nav: Navigator = navigator): boolean {
  return "standalone" in nav && Boolean((nav as Navigator & { standalone?: boolean }).standalone);
}

function isStandaloneDisplay(win: Window = window, nav: Navigator = navigator): boolean {
  return win.matchMedia(PLATFORM_MEDIA.standalone).matches || isIosStandalone(nav);
}

export function readPlatform(win: Window = window, nav: Navigator = navigator): PlatformSnapshot {
  return {
    formFactor: win.matchMedia(PLATFORM_MEDIA.phone).matches ? "phone" : "desktop",
    displayMode: isStandaloneDisplay(win, nav) ? "standalone" : "browser",
    pointer: win.matchMedia(PLATFORM_MEDIA.coarsePointer).matches ? "coarse" : "fine",
    isIos: isIosDevice(iosDeviceInputFromNavigator(nav, win)),
    prefersReducedMotion: win.matchMedia(PLATFORM_MEDIA.reducedMotion).matches,
  };
}

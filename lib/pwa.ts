import { AUTHENTICATED_HOME_PATH } from "@/lib/auth/safe-next-path";

export const PWA_NAME = "Lobyas";
export const PWA_SHORT_NAME = "Lobyas";
export const PWA_DESCRIPTION =
  "Learn the terms of any field or language well enough to actually use them: read, review, and quiz until they stick.";
export const PWA_START_URL = `${AUTHENTICATED_HOME_PATH}?source=pwa`;
/** Identifies the installed app. Kept at its old value on purpose: a changed id makes browsers
 *  treat existing installs as a different app. */
export const PWA_ID = "/jargon?source=pwa";
export const PWA_THEME_COLOR = "#3f4755";
/** The app's paper colour, so Android's splash and the first screen match. */
export const PWA_BACKGROUND_COLOR = "#fdfcf9";
export const PWA_INSTALL_DISMISS_KEY = "pwa-install-dismissed";

export const PWA_SCREENSHOT_WIDE = { width: 1280, height: 720 } as const;
export const PWA_SCREENSHOT_NARROW = { width: 750, height: 1334 } as const;

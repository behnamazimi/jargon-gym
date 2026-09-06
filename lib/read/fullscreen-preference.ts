const STORAGE_KEY = "jargon-gym:read-fullscreen-preference:v1";

/** "Default intent" only — never used to auto-enter fullscreen, since
 *  browsers require a fresh user gesture for requestFullscreen(). It just
 *  pre-highlights the toggle so returning users can resume in one tap. */
export function loadReadFullscreenPreference(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveReadFullscreenPreference(enabled: boolean): void {
  if (typeof window === "undefined") return;

  try {
    if (enabled) {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore quota errors or private browsing restrictions.
  }
}

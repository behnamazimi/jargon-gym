const STORAGE_KEY = "jargon-gym:story-session:v1";

/** Remembers the unread story on screen so a reload can offer to resume it. */
export function saveCurrentStoryId(storyId: string): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, storyId);
  } catch {
    // Ignore storage restrictions (private browsing, quota).
  }
}

export function loadCurrentStoryId(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearCurrentStoryId(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage restrictions.
  }
}

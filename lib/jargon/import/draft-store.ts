const STORAGE_KEY = "jargon-gym:import-draft:v1";
const CHANGE_EVENT = "jargon-gym:import-draft-change";

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The pasted list saved on this phone, so switching apps loses nothing. */
export function readDraft(): string {
  try {
    return storage()?.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function announce() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function writeDraft(text: string): void {
  try {
    if (text) storage()?.setItem(STORAGE_KEY, text);
    else storage()?.removeItem(STORAGE_KEY);
  } catch {
    // Private mode or a full disk: the list just isn't kept.
  }
  announce();
}

/** Lists can be private, so they're cleared after a commit and on sign-out. */
export function clearDraft(): void {
  writeDraft("");
}

export function subscribeToDraft(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

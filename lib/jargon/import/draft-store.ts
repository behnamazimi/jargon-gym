const STORAGE_KEY = "jargon-gym:import-draft:v1";
const CHANGE_EVENT = "jargon-gym:import-draft-change";

export type DraftStore = {
  read: () => string;
  write: (text: string) => void;
  clear: () => void;
  subscribe: (callback: () => void) => () => void;
};

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** A pasted list saved on this phone under one key, so switching apps loses nothing.
 *  Lists can be private, so callers clear it after a commit and on sign-out. */
export function createDraftStore(key: string, changeEvent = `${CHANGE_EVENT}:${key}`): DraftStore {
  function read(): string {
    try {
      return storage()?.getItem(key) ?? "";
    } catch {
      return "";
    }
  }

  function write(text: string): void {
    try {
      if (text) storage()?.setItem(key, text);
      else storage()?.removeItem(key);
    } catch {
      // Private mode or a full disk: the list just isn't kept.
    }
    if (typeof window !== "undefined") window.dispatchEvent(new Event(changeEvent));
  }

  function subscribe(callback: () => void): () => void {
    window.addEventListener(changeEvent, callback);
    window.addEventListener("storage", callback);
    return () => {
      window.removeEventListener(changeEvent, callback);
      window.removeEventListener("storage", callback);
    };
  }

  return { read, write, clear: () => write(""), subscribe };
}

const personalDraft = createDraftStore(STORAGE_KEY, CHANGE_EVENT);

export const readDraft = personalDraft.read;
export const writeDraft = personalDraft.write;
export const clearDraft = personalDraft.clear;
export const subscribeToDraft = personalDraft.subscribe;
export { personalDraft };

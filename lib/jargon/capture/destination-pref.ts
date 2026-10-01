const KEY = "jargon-gym:capture-destination:v1";

const listeners = new Set<() => void>();

/** The collection a term was last captured into on this device. */
export function loadDestinationPref(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveDestinationPref(domainId: string): void {
  try {
    window.localStorage.setItem(KEY, domainId);
  } catch {
    // Not kept in private mode.
  }
  for (const listener of listeners) listener();
}

export function subscribeDestinationPref(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

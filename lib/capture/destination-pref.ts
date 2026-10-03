const KEY = "lobyas:capture-destination:v1";

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
}

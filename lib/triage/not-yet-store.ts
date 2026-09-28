import { parseNotYetIds } from "./deck";

const STORAGE_PREFIX = "jargon-gym:triage-not-yet:v1:";

const listeners = new Set<() => void>();

function storageKey(domainId: string) {
  return `${STORAGE_PREFIX}${domainId}`;
}

function notify() {
  for (const listener of listeners) listener();
}

/** Raw stored string, so useSyncExternalStore gets a stable snapshot. */
export function loadNotYetSnapshot(domainId: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(storageKey(domainId)) ?? "";
  } catch {
    return "";
  }
}

export function subscribeNotYet(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);

  function onStorage(event: StorageEvent) {
    if (event.key === null || event.key.startsWith(STORAGE_PREFIX)) onStoreChange();
  }

  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

function writeNotYet(domainId: string, ids: string[]) {
  try {
    if (ids.length === 0) {
      window.localStorage.removeItem(storageKey(domainId));
    } else {
      window.localStorage.setItem(storageKey(domainId), JSON.stringify(ids));
    }
    notify();
  } catch {
    // Ignore quota errors or private browsing restrictions.
  }
}

export function addNotYet(domainId: string, termId: string) {
  const ids = parseNotYetIds(loadNotYetSnapshot(domainId));
  if (ids.includes(termId)) return;
  writeNotYet(domainId, [...ids, termId]);
}

export function removeNotYet(domainId: string, termId: string) {
  const ids = parseNotYetIds(loadNotYetSnapshot(domainId));
  writeNotYet(
    domainId,
    ids.filter((id) => id !== termId),
  );
}

export function clearNotYet(domainId: string) {
  writeNotYet(domainId, []);
}

import { parseNotYetIds } from "./deck";

// Before "Not yet" synced to the DB it lived in this browser's localStorage.
const STORAGE_PREFIX = "jargon-gym:triage-not-yet:v1:";

function storageKey(domainId: string) {
  return `${STORAGE_PREFIX}${domainId}`;
}

export function readLegacyNotYetIds(domainId: string): string[] {
  try {
    return parseNotYetIds(window.localStorage.getItem(storageKey(domainId)));
  } catch {
    return [];
  }
}

export function clearLegacyNotYetIds(domainId: string) {
  try {
    window.localStorage.removeItem(storageKey(domainId));
  } catch {
    // Storage blocked; nothing to clean up.
  }
}

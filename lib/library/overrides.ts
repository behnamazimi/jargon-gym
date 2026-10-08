"use client";

import { useSyncExternalStore } from "react";

/**
 * Edits made on this device that a server snapshot may not include yet:
 * marking a term known and deleting a term don't re-render the page, and the
 * router can restore an older snapshot on back/forward.
 *
 * Both sides carry server times: `savedAt` comes back from the action once the
 * write is committed, and a snapshot's `loadedAt` is taken before it reads
 * anything. A snapshot that started reading after the save includes it; any
 * other snapshot gets the edit laid over it (at worst a no-op).
 */
type TermOverride = { marked?: boolean; removed?: boolean; savedAt: number };

export type CollectionCounts = {
  termCount: number;
  knownCount: number;
  termsLearnedCount: number;
  savedAt: number;
};

type State = {
  terms: ReadonlyMap<string, TermOverride>;
  counts: ReadonlyMap<string, CollectionCounts>;
};

const EMPTY: State = { terms: new Map(), counts: new Map() };
let state: State = EMPTY;
const listeners = new Set<() => void>();

function emit(next: State) {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLibraryOverrides(): State {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => EMPTY,
  );
}

function setTerm(termId: string, change: Omit<TermOverride, "savedAt">, savedAt: number) {
  const terms = new Map(state.terms);
  terms.set(termId, { ...terms.get(termId), ...change, savedAt });
  emit({ ...state, terms });
}

export function overrideMarkedKnown(termId: string, marked: boolean, savedAt: number) {
  setTerm(termId, { marked }, savedAt);
}

export function overrideRemoved(termId: string, savedAt: number) {
  setTerm(termId, { removed: true }, savedAt);
}

/** The collection's live counts, for the sidebar next to the list. */
export function overrideCollectionCounts(collectionId: string, counts: CollectionCounts) {
  const next = new Map(state.counts);
  next.set(collectionId, counts);
  emit({ ...state, counts: next });
}

/** The term's override when the snapshot may not include it, else undefined. */
export function termOverride(
  overrides: State,
  termId: string,
  loadedAt: number,
): TermOverride | undefined {
  const override = overrides.terms.get(termId);
  return override && override.savedAt >= loadedAt ? override : undefined;
}

export function collectionCountsOverride(
  overrides: State,
  collectionId: string,
  loadedAt: number,
): CollectionCounts | undefined {
  const counts = overrides.counts.get(collectionId);
  return counts && counts.savedAt >= loadedAt ? counts : undefined;
}

/** Test-only reset. */
export function resetLibraryOverrides() {
  emit(EMPTY);
}

"use client";

import { useSyncExternalStore } from "react";

/**
 * Edits made on this device that a server snapshot may not include yet:
 * marking a term known and deleting a term no longer re-render the page, and
 * the router can restore an older snapshot on back/forward. An edit wins over
 * any snapshot first seen before it was made; a snapshot first seen after it
 * already includes it. All times are this browser's clock.
 */
type TermOverride = { marked?: boolean; removed?: boolean; at: number };

export type CollectionCounts = {
  termCount: number;
  knownCount: number;
  termsLearnedCount: number;
  at: number;
};

type State = {
  terms: ReadonlyMap<string, TermOverride>;
  counts: ReadonlyMap<string, CollectionCounts>;
};

const EMPTY: State = { terms: new Map(), counts: new Map() };
let state: State = EMPTY;
const listeners = new Set<() => void>();
const firstSeen = new Map<string, number>();

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

/** When this browser first rendered the snapshot with this key. Recording it
 *  during render is safe: it is set once and never read by anything else. */
export function snapshotSeenAt(key: string): number {
  let seen = firstSeen.get(key);
  if (seen === undefined) {
    seen = Date.now();
    firstSeen.set(key, seen);
  }
  return seen;
}

function setTerm(termId: string, change: Omit<TermOverride, "at">) {
  const terms = new Map(state.terms);
  terms.set(termId, { ...terms.get(termId), ...change, at: Date.now() });
  emit({ ...state, terms });
}

export function overrideMarkedKnown(termId: string, marked: boolean) {
  setTerm(termId, { marked });
}

export function overrideRemoved(termId: string, removed: boolean) {
  setTerm(termId, { removed });
}

/** The collection's live counts, for the sidebar next to the list. */
export function overrideCollectionCounts(domainId: string, counts: Omit<CollectionCounts, "at">) {
  const next = new Map(state.counts);
  next.set(domainId, { ...counts, at: Date.now() });
  emit({ ...state, counts: next });
}

/** The term's override when it is newer than the snapshot, else undefined. */
export function termOverride(
  overrides: State,
  termId: string,
  seenAt: number,
): TermOverride | undefined {
  const override = overrides.terms.get(termId);
  return override && override.at > seenAt ? override : undefined;
}

export function collectionCountsOverride(
  overrides: State,
  domainId: string,
  seenAt: number,
): CollectionCounts | undefined {
  const counts = overrides.counts.get(domainId);
  return counts && counts.at > seenAt ? counts : undefined;
}

/** Test-only reset. */
export function resetLibraryOverrides() {
  firstSeen.clear();
  emit(EMPTY);
}

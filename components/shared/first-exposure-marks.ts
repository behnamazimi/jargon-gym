"use client";

import { useSyncExternalStore } from "react";
import { setTermMarkedKnownAction } from "@/app/(private)/app/actions";
import { overrideMarkedKnown } from "@/lib/library/overrides";

type WriteResult = { error?: string; savedAt?: number };

/** Terms marked known from a first-exposure prompt on this device. A card
 *  unmounts as soon as the study flow moves on, so the mark lives here for the
 *  card to show it again when the learner comes back. */
let marked: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();
const pendingWrites = new Map<string, Promise<WriteResult>>();

function setMarked(termId: string, isMarked: boolean) {
  const next = new Set(marked);
  if (isMarked) next.add(termId);
  else next.delete(termId);
  marked = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useFirstExposureMarked(termId: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => marked.has(termId),
    () => false,
  );
}

/** Flips the mark at once and saves it once any earlier write for the term has
 *  landed, so a quick mark then unmark can't reach the server out of order. */
export function setFirstExposureMarked(termId: string, isMarked: boolean, onFailed: () => void) {
  if (marked.has(termId) === isMarked) return;
  setMarked(termId, isMarked);

  const previous = pendingWrites.get(termId) ?? Promise.resolve({});
  const write = previous.then(() => setTermMarkedKnownAction(termId, isMarked));
  pendingWrites.set(termId, write);

  void write.then(({ error, savedAt }) => {
    if (pendingWrites.get(termId) === write) pendingWrites.delete(termId);
    if (savedAt) {
      overrideMarkedKnown(termId, isMarked, savedAt);
      return;
    }
    if (!error) return;
    setMarked(termId, !isMarked);
    onFailed();
  });
}

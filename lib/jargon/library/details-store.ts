"use client";

import { useSyncExternalStore } from "react";
import type { Term } from "@/lib/jargon/types";

/**
 * Full term details for the Library, kept for the browser session. Rows ask
 * for theirs as they come near the viewport; the ids are gathered for a
 * moment and fetched together, up to MAX_BATCH per request.
 */
const MAX_BATCH = 50;
const FLUSH_DELAY_MS = 50;

type Entry = Term | "failed";

const entries = new Map<string, Entry>();
const inflight = new Map<string, Promise<void>>();
const queued = new Set<string>();
const listeners = new Set<() => void>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function fetchBatch(ids: string[]): Promise<void> {
  try {
    const response = await fetch(`/api/jargon/terms/details?ids=${ids.join(",")}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { terms } = (await response.json()) as { terms: Term[] };
    const found = new Set<string>();
    for (const term of terms) {
      entries.set(term.id, term);
      found.add(term.id);
    }
    for (const id of ids) if (!found.has(id)) entries.set(id, "failed");
  } catch {
    for (const id of ids) entries.set(id, "failed");
  } finally {
    for (const id of ids) inflight.delete(id);
    emit();
  }
}

function startBatches(ids: string[]) {
  for (let start = 0; start < ids.length; start += MAX_BATCH) {
    const batch = ids.slice(start, start + MAX_BATCH);
    const promise = fetchBatch(batch);
    for (const id of batch) inflight.set(id, promise);
  }
}

function flush() {
  flushTimer = null;
  const ids = [...queued];
  queued.clear();
  startBatches(ids);
}

function needsFetch(id: string) {
  const entry = entries.get(id);
  return (entry === undefined || entry === "failed") && !inflight.has(id);
}

/** Asks for these terms soon, together with any other rows asking now. */
export function prefetchTermDetails(termIds: string[]) {
  for (const id of termIds) if (needsFetch(id)) queued.add(id);
  if (queued.size > 0 && flushTimer === null) flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
}

/** Resolves once the term's details are loaded (or failed to load). */
export async function loadTermDetails(termId: string): Promise<Term | undefined> {
  if (needsFetch(termId)) {
    queued.delete(termId);
    startBatches([termId]);
  }
  await inflight.get(termId);
  const entry = entries.get(termId);
  return entry === "failed" ? undefined : entry;
}

/** Drops every loaded term, after an edit that may change several of them
 *  (a new link shows on both ends), so the rows on screen load again. */
export function clearTermDetails() {
  entries.clear();
  emit();
}

/** The term's details: the term, "failed", or undefined while not loaded. */
export function useTermDetails(termId: string): Entry | undefined {
  return useSyncExternalStore(
    subscribe,
    () => entries.get(termId),
    () => undefined,
  );
}

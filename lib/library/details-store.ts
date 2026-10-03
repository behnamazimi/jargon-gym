"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import type { Term } from "@/lib/terms/types";

/**
 * Full term details for the Library. Rows ask for theirs as they come near
 * the viewport; the ids are gathered for a moment and fetched together, up
 * to MAX_BATCH per request.
 *
 * Details are kept per server snapshot of the collection (its scope). A new
 * snapshot, after an edit, an import or a refresh, starts with nothing, so
 * stale details never outlive the data they came with. A request writes into
 * the scope it started in, so a late answer can't overwrite newer data.
 */
const MAX_BATCH = 50;
const FLUSH_DELAY_MS = 50;
/** The current snapshot plus a couple the browser may go back to. */
const KEPT_SCOPES = 3;

type Entry = Term | "failed";

type Scope = {
  entries: Map<string, Entry>;
  inflight: Map<string, Promise<void>>;
  queued: Set<string>;
  flushTimer: ReturnType<typeof setTimeout> | null;
};

const scopes = new Map<string, Scope>();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function newScope(): Scope {
  return { entries: new Map(), inflight: new Map(), queued: new Set(), flushTimer: null };
}

function scopeFor(key: string): Scope {
  let scope = scopes.get(key);
  if (!scope) {
    scope = newScope();
    scopes.set(key, scope);
    for (const oldest of scopes.keys()) {
      if (scopes.size <= KEPT_SCOPES) break;
      scopes.delete(oldest);
    }
  }
  return scope;
}

async function fetchBatch(scope: Scope, ids: string[]): Promise<void> {
  try {
    const response = await fetch(`/api/terms/details?ids=${ids.join(",")}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { terms } = (await response.json()) as { terms: Term[] };
    const found = new Set<string>();
    for (const term of terms) {
      scope.entries.set(term.id, term);
      found.add(term.id);
    }
    for (const id of ids) if (!found.has(id)) scope.entries.set(id, "failed");
  } catch {
    for (const id of ids) scope.entries.set(id, "failed");
  } finally {
    for (const id of ids) scope.inflight.delete(id);
    emit();
  }
}

function startBatches(scope: Scope, ids: string[]) {
  for (let start = 0; start < ids.length; start += MAX_BATCH) {
    const batch = ids.slice(start, start + MAX_BATCH);
    const promise = fetchBatch(scope, batch);
    for (const id of batch) scope.inflight.set(id, promise);
  }
}

/** Loaded, already loading or failed terms aren't asked for again; a failed
 *  one waits for retryTermDetails. */
function isNew(scope: Scope, id: string) {
  return !scope.entries.has(id) && !scope.inflight.has(id);
}

/** Asks for these terms soon, together with any other rows asking now. */
export function prefetchTermDetails(key: string, termIds: string[]) {
  const scope = scopeFor(key);
  for (const id of termIds) if (isNew(scope, id)) scope.queued.add(id);
  if (scope.queued.size === 0 || scope.flushTimer !== null) return;
  scope.flushTimer = setTimeout(() => {
    scope.flushTimer = null;
    const ids = [...scope.queued];
    scope.queued.clear();
    startBatches(scope, ids);
  }, FLUSH_DELAY_MS);
}

/** Tries a failed term again. */
export function retryTermDetails(key: string, termId: string) {
  const scope = scopeFor(key);
  if (scope.entries.get(termId) !== "failed") return;
  scope.entries.delete(termId);
  emit();
  prefetchTermDetails(key, [termId]);
}

/** Resolves once the term's details are loaded, or undefined if they can't be. */
export async function loadTermDetails(key: string, termId: string): Promise<Term | undefined> {
  const scope = scopeFor(key);
  if (scope.entries.get(termId) === "failed") scope.entries.delete(termId);
  if (isNew(scope, termId)) {
    scope.queued.delete(termId);
    startBatches(scope, [termId]);
  }
  await scope.inflight.get(termId);
  const entry = scope.entries.get(termId);
  return entry === "failed" ? undefined : entry;
}

/** Drops this snapshot's details, e.g. after a term is deleted (its name may
 *  still be listed under related terms). Requests already on their way land
 *  in the dropped scope and are ignored. */
export function forgetTermDetails(key: string) {
  if (!scopes.has(key)) return;
  scopes.set(key, newScope());
  emit();
}

/** The snapshot the rows below read details for. */
export const TermDetailsScope = createContext("");

/** The term's details: the term, "failed", or undefined while not loaded. */
export function useTermDetails(termId: string): Entry | undefined {
  const key = useContext(TermDetailsScope);
  return useSyncExternalStore(
    subscribe,
    () => scopes.get(key)?.entries.get(termId),
    () => undefined,
  );
}

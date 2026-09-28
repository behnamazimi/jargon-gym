"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { setTermMarkedKnownAction } from "@/app/(private)/jargon/actions";
import { useToast } from "@/components/ui/toast";
import type { Term } from "@/lib/jargon/types";
import { buildTriageDeck, parseNotYetIds } from "@/lib/triage/deck";
import {
  addNotYet,
  clearNotYet,
  loadNotYetSnapshot,
  removeNotYet,
  subscribeNotYet,
} from "@/lib/triage/not-yet-store";

type TriageChoice = { termId: string; kind: "knew" | "notYet" };

type MarkResult = Promise<{ error?: string }>;

function withId(ids: ReadonlySet<string>, id: string) {
  return new Set(ids).add(id);
}

function withoutId(ids: ReadonlySet<string>, id: string) {
  const next = new Set(ids);
  next.delete(id);
  return next;
}

/** Triage state: the deck is derived, never indexed. Marking a card known
 *  or setting it aside drops it from `deck`, so the next card is always
 *  `deck[0]`, and undo just puts it back. */
export function useTriageDeck({
  domainId,
  terms,
  knownTermIds,
  markedKnownTermIds,
}: {
  domainId: string;
  terms: Term[];
  knownTermIds: string[];
  markedKnownTermIds: string[];
}) {
  const { toast } = useToast();
  // null until the client can read localStorage, so hydration never mismatches.
  const notYetSnapshot = useSyncExternalStore(
    subscribeNotYet,
    () => loadNotYetSnapshot(domainId),
    () => null,
  );
  const [markedKnown, setMarkedKnown] = useState<ReadonlySet<string>>(
    () => new Set(markedKnownTermIds),
  );
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [history, setHistory] = useState<TriageChoice[]>([]);
  // Undo waits on the mark it reverses, or the two writes could race.
  const pendingMarksRef = useRef(new Map<string, MarkResult>());

  const knownIds = useMemo(() => new Set(knownTermIds), [knownTermIds]);
  const notYetIds = useMemo(() => new Set(parseNotYetIds(notYetSnapshot)), [notYetSnapshot]);
  const deck = useMemo(
    () => buildTriageDeck(terms, { knownIds, markedKnownIds: markedKnown, notYetIds }),
    [terms, knownIds, markedKnown, notYetIds],
  );
  const current = deck.at(0) ?? null;
  const revealed = current !== null && current.id === revealedId;
  // A swipe commits after its fly-out, so a button press in between must
  // not act on the card that replaced it.
  const currentIdRef = useRef<string | null>(null);
  currentIdRef.current = current?.id ?? null;

  function writeMarked(term: Term, marked: boolean): MarkResult {
    setMarkedKnown((ids) => (marked ? withId(ids, term.id) : withoutId(ids, term.id)));
    const previous = pendingMarksRef.current.get(term.id) ?? Promise.resolve({});
    const result = previous.then(() => setTermMarkedKnownAction(term.id, marked));
    pendingMarksRef.current.set(term.id, result);
    void result.then(({ error }) => {
      if (!error) return;
      setMarkedKnown((ids) => (marked ? withoutId(ids, term.id) : withId(ids, term.id)));
      toast(
        marked
          ? `Couldn't mark "${term.term}" known. Try again.`
          : `Couldn't update "${term.term}". Try again.`,
        "destructive",
      );
    });
    return result;
  }

  function handleKnew(termId: string) {
    if (!current || termId !== currentIdRef.current) return;
    writeMarked(current, true);
    setHistory((prev) => [...prev, { termId, kind: "knew" }]);
  }

  function handleNotYet(termId: string) {
    if (termId !== currentIdRef.current) return;
    addNotYet(domainId, termId);
    setHistory((prev) => [...prev, { termId, kind: "notYet" }]);
  }

  function handleUndo() {
    const last = history.at(-1);
    if (!last) return;
    setHistory((prev) => prev.slice(0, -1));
    setRevealedId(null);
    if (last.kind === "notYet") {
      removeNotYet(domainId, last.termId);
      return;
    }
    const term = terms.find((t) => t.id === last.termId);
    if (term) writeMarked(term, false);
  }

  function handleRevisitNotYet() {
    clearNotYet(domainId);
    setHistory([]);
  }

  return {
    ready: notYetSnapshot !== null,
    deck,
    current,
    revealed,
    reveal: () => {
      if (current) setRevealedId(current.id);
    },
    history,
    knownIds,
    markedKnown,
    notYetIds,
    knew: handleKnew,
    notYet: handleNotYet,
    undo: handleUndo,
    revisitNotYet: handleRevisitNotYet,
  };
}

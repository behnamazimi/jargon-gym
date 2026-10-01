"use client";

import { useMemo, useRef, useState } from "react";
import { setTermMarkedKnownAction } from "@/app/(private)/jargon/actions";
import { overrideMarkedKnown } from "@/lib/jargon/library/overrides";
import {
  addNotYetTermsAction,
  clearNotYetDomainAction,
  removeNotYetTermAction,
} from "@/app/(private)/jargon/actions-triage";
import { useToast } from "@/components/ui/toast";
import type { Term } from "@/lib/jargon/types";
import { buildTriageDeck } from "@/lib/triage/deck";

type TriageChoice = { termId: string; kind: "knew" | "notYet" };

type MarkResult = Promise<{ error?: string; savedAt?: number }>;

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
  notYetTermIds,
}: {
  domainId: string;
  terms: Term[];
  knownTermIds: string[];
  markedKnownTermIds: string[];
  notYetTermIds: string[];
}) {
  const { toast } = useToast();
  const [markedKnown, setMarkedKnown] = useState<ReadonlySet<string>>(
    () => new Set(markedKnownTermIds),
  );
  const [notYetIds, setNotYetIds] = useState<ReadonlySet<string>>(() => new Set(notYetTermIds));
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [history, setHistory] = useState<TriageChoice[]>([]);
  // Undo waits on the mark it reverses, or the two writes could race.
  const pendingMarksRef = useRef(new Map<string, MarkResult>());
  const pendingNotYetRef = useRef(new Map<string, MarkResult>());

  const knownIds = useMemo(() => new Set(knownTermIds), [knownTermIds]);
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
    void result.then(({ error, savedAt }) => {
      if (savedAt) {
        overrideMarkedKnown(term.id, marked, savedAt);
        return;
      }
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

  function writeNotYet(termId: string, notYet: boolean) {
    setNotYetIds((ids) => (notYet ? withId(ids, termId) : withoutId(ids, termId)));
    const previous = pendingNotYetRef.current.get(termId) ?? Promise.resolve({});
    const result = previous.then(() =>
      notYet ? addNotYetTermsAction([termId]) : removeNotYetTermAction(termId),
    );
    pendingNotYetRef.current.set(termId, result);
    void result.then(({ error }) => {
      if (!error) return;
      setNotYetIds((ids) => (notYet ? withoutId(ids, termId) : withId(ids, termId)));
    });
  }

  function handleNotYet(termId: string) {
    if (termId !== currentIdRef.current) return;
    writeNotYet(termId, true);
    setHistory((prev) => [...prev, { termId, kind: "notYet" }]);
  }

  function handleUndo() {
    const last = history.at(-1);
    if (!last) return;
    setHistory((prev) => prev.slice(0, -1));
    setRevealedId(null);
    if (last.kind === "notYet") {
      writeNotYet(last.termId, false);
      return;
    }
    const term = terms.find((t) => t.id === last.termId);
    if (term) writeMarked(term, false);
  }

  function handleRevisitNotYet() {
    const previousIds = notYetIds;
    setNotYetIds(new Set());
    setHistory([]);
    void clearNotYetDomainAction(domainId).then(({ error }) => {
      if (error) setNotYetIds(previousIds);
    });
  }

  return {
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

import { useCallback, useRef, useState } from "react";
import { recordReadRevealAction } from "@/app/(private)/jargon/read/actions";

export function useReadRevealTracking(initialRevealedTermIds: string[] | undefined) {
  const [revealedIds, setRevealedIds] = useState<Set<string>>(
    () => new Set(initialRevealedTermIds ?? []),
  );
  // Synchronous, StrictMode-safe guard for the reveal/record side effect —
  // two reveal triggers landing in the same tick (a fast double-tap, or
  // Enter racing a click) must not double-record. `revealedIds` state
  // exists only to trigger re-renders for masked/revealed UI; this ref is
  // the actual source of truth for "have we recorded this yet".
  const recordedIdsRef = useRef<Set<string>>(new Set(initialRevealedTermIds ?? []));

  const reveal = useCallback((termId: string) => {
    // Always sync UI state, even if the DB write below is guarded off —
    // self-healing if a stray extra call ever arrives after the ref guard
    // has already tripped (e.g. a re-fired observer), rather than a
    // desync where recordedIdsRef thinks a term is done but the masked/
    // revealed UI never actually reflects it.
    setRevealedIds((current) => (current.has(termId) ? current : new Set(current).add(termId)));

    if (recordedIdsRef.current.has(termId)) return;
    recordedIdsRef.current.add(termId);
    void recordReadRevealAction(termId);
  }, []);

  const isRevealed = useCallback((termId: string) => revealedIds.has(termId), [revealedIds]);

  return { reveal, isRevealed };
}

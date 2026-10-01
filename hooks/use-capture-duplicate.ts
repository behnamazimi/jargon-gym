"use client";

import { useRef, useState } from "react";
import { findCaptureDuplicate } from "@/app/(private)/jargon/capture/actions";

const DEBOUNCE_MS = 300;

export type DuplicateMatch = { term: string; finished: boolean };

/** Looks for the typed term in the chosen collection after a short pause. The
 *  timer and request counter live in refs, so a slow answer never overwrites a newer one. */
export function useCaptureDuplicate() {
  const [match, setMatch] = useState<DuplicateMatch | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const requestId = useRef(0);

  function check(domainId: string | null, term: string) {
    window.clearTimeout(timer.current);
    const id = ++requestId.current;
    const trimmed = term.trim();
    if (!domainId || !trimmed) {
      setMatch(null);
      return;
    }
    timer.current = window.setTimeout(async () => {
      const result = await findCaptureDuplicate({ domainId, term: trimmed });
      if (id !== requestId.current) return;
      setMatch(result.ok ? result.match : null);
    }, DEBOUNCE_MS);
  }

  return { match, check };
}

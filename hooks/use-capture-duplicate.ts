"use client";

import { useRef, useState } from "react";
import { findCaptureDuplicate } from "@/app/(private)/app/capture/actions";
import { createDuplicateChecker, type DuplicateMatch } from "@/lib/capture/duplicate-checker";

const DEBOUNCE_MS = 300;

/** Looks for the typed term in the chosen collection after a short pause. */
export function useCaptureDuplicate() {
  const [match, setMatch] = useState<DuplicateMatch | null>(null);
  const checker = useRef<ReturnType<typeof createDuplicateChecker> | null>(null);

  function check(domainId: string | null, term: string) {
    checker.current ??= createDuplicateChecker(
      async (id, text) => {
        const result = await findCaptureDuplicate({ domainId: id, term: text });
        return result.ok ? result.match : null;
      },
      setMatch,
      DEBOUNCE_MS,
    );
    checker.current(domainId, term);
  }

  return { match, check };
}

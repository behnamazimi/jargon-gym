"use client";

import { useRef, useState } from "react";
import { loadCaptureTerms, type CaptureTerm } from "@/app/(private)/app/capture/actions";

type Loaded = { collectionId: string; terms: CaptureTerm[] };

/** The terms already in the chosen collection. Call `load` when the collection
 *  is picked; a late answer for an earlier pick is ignored. */
export function useCaptureTerms() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const latest = useRef<string | null>(null);

  async function load(collectionId: string) {
    latest.current = collectionId;
    const result = await loadCaptureTerms({ collectionId });
    if (!result.ok || latest.current !== collectionId) return;
    setLoaded({ collectionId, terms: result.terms });
  }

  function termsFor(collectionId: string): CaptureTerm[] {
    return loaded?.collectionId === collectionId ? loaded.terms : [];
  }

  return { load, termsFor };
}

"use client";

import { useRef, useState } from "react";
import { loadCaptureTerms, type CaptureTerm } from "@/app/(private)/app/capture/actions";

type Loaded = { domainId: string; terms: CaptureTerm[] };

/** The terms already in the chosen collection. Call `load` when the collection
 *  is picked; a late answer for an earlier pick is ignored. */
export function useCaptureTerms() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const latest = useRef<string | null>(null);

  async function load(domainId: string) {
    latest.current = domainId;
    const result = await loadCaptureTerms({ domainId });
    if (!result.ok || latest.current !== domainId) return;
    setLoaded({ domainId, terms: result.terms });
  }

  function termsFor(domainId: string): CaptureTerm[] {
    return loaded?.domainId === domainId ? loaded.terms : [];
  }

  return { load, termsFor };
}

"use client";

import { useCallback, useRef, useState } from "react";
import { getMyAiCreditsAction } from "@/app/(private)/jargon/actions-ai-credits";
import {
  toAiCreditsLoad,
  type AiCreditsLoad,
  type AiCreditsMenuMode,
} from "@/lib/ai-credits/menu-line";

/** Loads the AI credits balance when a menu opens, so ordinary page loads
 *  don't pay for it. Keeps the last balance on screen while it refreshes, runs
 *  one lookup at a time, and hides the row if the lookup fails. */
export function useAiCredits(mode: AiCreditsMenuMode) {
  const [load, setLoad] = useState<AiCreditsLoad>({ status: "idle", remaining: null });
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (mode !== "credits" || inFlight.current) return;

    inFlight.current = true;
    setLoad((current) => ({ ...current, status: "loading" }));
    try {
      setLoad(toAiCreditsLoad(await getMyAiCreditsAction()));
    } catch {
      setLoad(toAiCreditsLoad(null));
    } finally {
      inFlight.current = false;
    }
  }, [mode]);

  return { load, refresh };
}

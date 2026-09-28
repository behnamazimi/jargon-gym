"use client";

import { useState } from "react";
import { getMyAiCreditsAction } from "@/app/(private)/jargon/actions-ai-credits";
import type { AiCreditsLoad, AiCreditsMenuMode } from "@/lib/ai-credits/menu-line";

/** Loads the AI credits balance when a menu opens, so ordinary page loads
 *  don't pay for it. Keeps the last balance on screen while it refreshes. */
export function useAiCredits(mode: AiCreditsMenuMode) {
  const [load, setLoad] = useState<AiCreditsLoad>({ status: "idle", remaining: null });

  async function refresh() {
    if (mode !== "credits") return;

    setLoad((current) => ({ ...current, status: "loading" }));
    const result = await getMyAiCreditsAction();
    setLoad(
      result
        ? { status: "ready", remaining: result.remaining }
        : { status: "hidden", remaining: null },
    );
  }

  return { load, refresh };
}

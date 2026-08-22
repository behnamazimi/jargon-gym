"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { NextBestActionHint } from "@/lib/smart-queue/next-best-action";

const HintContext = createContext<NextBestActionHint[]>([]);

export function HintProvider({
  hints,
  children,
}: {
  hints: NextBestActionHint[];
  children: ReactNode;
}) {
  return <HintContext.Provider value={hints}>{children}</HintContext.Provider>;
}

export function useHints(): NextBestActionHint[] {
  return useContext(HintContext);
}

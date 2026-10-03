"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { MoreSheet } from "@/components/app/study-phone-more-sheet";
import { useAiCredits } from "@/hooks/use-ai-credits";
import {
  aiCreditsLine,
  type AiCreditsLine,
  type AiCreditsMenuMode,
} from "@/lib/ai-credits/menu-line";
import { studyBackTarget } from "@/lib/chrome";

type StudyPhoneContextValue = {
  email: string;
  isAdmin: boolean;
  initialIsDark: boolean;
  currentStreak: number;
  longestStreak: number;
  moreOpen: boolean;
  setMoreOpen: (open: boolean) => void;
  /** What the More sheet says about AI credits, or null to say nothing. */
  aiCreditsLine: AiCreditsLine | null;
  /** Where the top bar's back arrow goes on overflow pages. */
  backHref: string;
  /** True once the visitor has navigated inside the app, so "back" has somewhere to go. */
  hasInAppHistory: boolean;
};

const StudyPhoneContext = createContext<StudyPhoneContextValue | null>(null);

export function useStudyPhone() {
  const ctx = useContext(StudyPhoneContext);
  if (!ctx) {
    throw new Error("Study phone chrome must be used inside StudyPhoneProvider");
  }
  return ctx;
}

export function StudyPhoneProvider({
  email,
  isAdmin,
  initialIsDark,
  currentStreak,
  longestStreak,
  aiCreditsMode,
  children,
}: {
  email: string;
  isAdmin: boolean;
  initialIsDark: boolean;
  currentStreak: number;
  longestStreak: number;
  aiCreditsMode: AiCreditsMenuMode;
  children: ReactNode;
}) {
  const [moreOpen, setMoreOpenState] = useState(false);
  const { load: aiCreditsLoad, refresh: refreshAiCredits } = useAiCredits(aiCreditsMode);

  // The balance is only looked up when the sheet opens.
  const setMoreOpen = useCallback(
    (open: boolean) => {
      setMoreOpenState(open);
      if (open) void refreshAiCredits();
    },
    [refreshAiCredits],
  );
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [backHref, setBackHref] = useState("/app/library");
  const [seenPath, setSeenPath] = useState(pathname);
  const [hasInAppHistory, setHasInAppHistory] = useState(false);
  if (pathname !== seenPath) {
    setSeenPath(pathname);
    setHasInAppHistory(true);
  }

  // Remember the last dock page while the chrome stays mounted, so an
  // overflow page's back arrow returns there. A cold load of an overflow
  // page has nothing remembered and falls back to the Library.
  const target = studyBackTarget(pathname, searchParams.toString());
  if (target !== null && target !== backHref) setBackHref(target);

  const value = useMemo(
    () => ({
      email,
      isAdmin,
      initialIsDark,
      currentStreak,
      longestStreak,
      moreOpen,
      setMoreOpen,
      aiCreditsLine: aiCreditsLine(aiCreditsMode, aiCreditsLoad),
      backHref,
      hasInAppHistory,
    }),
    [
      email,
      isAdmin,
      initialIsDark,
      currentStreak,
      longestStreak,
      moreOpen,
      setMoreOpen,
      aiCreditsMode,
      aiCreditsLoad,
      backHref,
      hasInAppHistory,
    ],
  );

  return (
    <StudyPhoneContext.Provider value={value}>
      {children}
      <MoreSheet />
    </StudyPhoneContext.Provider>
  );
}

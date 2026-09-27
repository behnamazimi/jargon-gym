"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { MoreSheet } from "@/components/app/study-phone-more-sheet";
import { studyBackTarget } from "@/lib/chrome";

type StudyPhoneContextValue = {
  email: string;
  isAdmin: boolean;
  initialIsDark: boolean;
  currentStreak: number;
  longestStreak: number;
  moreOpen: boolean;
  setMoreOpen: (open: boolean) => void;
  /** Where the top bar's back arrow goes on overflow pages. */
  backHref: string;
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
  children,
}: {
  email: string;
  isAdmin: boolean;
  initialIsDark: boolean;
  currentStreak: number;
  longestStreak: number;
  children: ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [backHref, setBackHref] = useState("/jargon");

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
      backHref,
    }),
    [email, isAdmin, initialIsDark, currentStreak, longestStreak, moreOpen, backHref],
  );

  return (
    <StudyPhoneContext.Provider value={value}>
      {children}
      <MoreSheet />
    </StudyPhoneContext.Provider>
  );
}

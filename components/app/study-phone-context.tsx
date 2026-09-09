"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { MoreSheet } from "@/components/app/study-phone-more-sheet";

type StudyPhoneContextValue = {
  email: string;
  isAdmin: boolean;
  initialIsDark: boolean;
  currentStreak: number;
  longestStreak: number;
  moreOpen: boolean;
  setMoreOpen: (open: boolean) => void;
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
  const value = useMemo(
    () => ({ email, isAdmin, initialIsDark, currentStreak, longestStreak, moreOpen, setMoreOpen }),
    [email, isAdmin, initialIsDark, currentStreak, longestStreak, moreOpen],
  );

  return (
    <StudyPhoneContext.Provider value={value}>
      {children}
      <MoreSheet />
    </StudyPhoneContext.Provider>
  );
}

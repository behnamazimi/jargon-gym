"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  StudyPhoneDock,
  StudyPhoneProvider,
  StudyPhoneTopBar,
} from "@/components/app/study-phone-chrome";
import { isDockPath, isStudyPath } from "@/lib/chrome";
import { cn } from "@/lib/utils";

type StudyPhoneProps = {
  email: string;
  isAdmin: boolean;
  initialIsDark: boolean;
  currentStreak: number;
  longestStreak: number;
};

export function AppShell({
  header,
  footer,
  studyPhone,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  studyPhone: StudyPhoneProps | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const phoneStudy = Boolean(studyPhone) && isStudyPath(pathname);
  const showDock = isDockPath(pathname);

  if (phoneStudy && studyPhone) {
    return (
      <StudyPhoneProvider
        email={studyPhone.email}
        isAdmin={studyPhone.isAdmin}
        initialIsDark={studyPhone.initialIsDark}
        currentStreak={studyPhone.currentStreak}
        longestStreak={studyPhone.longestStreak}
      >
        <div
          className={cn("flex min-h-full flex-1 flex-col chrome-study", showDock && "chrome-dock")}
          data-chrome="study"
        >
          <div className="hidden md:contents">{header}</div>
          <StudyPhoneTopBar />
          {children}
          <div className="hidden md:contents">{footer}</div>
          <StudyPhoneDock />
        </div>
      </StudyPhoneProvider>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col" data-chrome="site">
      {header}
      {children}
      {footer}
    </div>
  );
}

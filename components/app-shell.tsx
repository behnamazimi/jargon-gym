"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isDockPath, isStudyPath } from "@/lib/chrome";
import { cn } from "@/lib/utils";

export function AppShell({
  header,
  footer,
  studyPhoneChrome,
  hasLikelySession,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  studyPhoneChrome: ReactNode;
  hasLikelySession: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const showStudyChrome = hasLikelySession && isStudyPath(pathname);
  const showDock = isDockPath(pathname);

  if (showStudyChrome) {
    return (
      <div
        className={cn("flex min-h-full flex-1 flex-col chrome-study", showDock && "chrome-dock")}
        data-chrome="study"
      >
        <div className="hidden md:contents">{header}</div>
        {studyPhoneChrome}
        {children}
        <div className="hidden md:contents">{footer}</div>
      </div>
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

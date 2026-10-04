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
        className={cn(
          "flex min-h-full flex-1 flex-col chrome-study max-md:h-dvh max-md:min-h-0 max-md:overflow-hidden",
          showDock && "chrome-dock",
        )}
        data-chrome="study"
      >
        <div className="hidden md:contents">{header}</div>
        {studyPhoneChrome}
        {/* On phones the shell is exactly the viewport and only this area
            scrolls, so the dock and top bar can't drift with the document. */}
        <div className="flex min-h-0 flex-1 flex-col max-md:overflow-y-auto max-md:overscroll-contain md:contents">
          {children}
        </div>
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

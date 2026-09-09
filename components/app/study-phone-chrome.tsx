"use client";

import { ArrowLeft, Ellipsis } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { STUDY_DOCK_TABS, emailInitials, studyScreenTitle } from "@/components/app/account-nav";
import { BrandIcon } from "@/components/brand-icon";
import { InstallButton } from "@/components/pwa/install-prompt";
import { StreakBadge } from "@/components/streak-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { isDockPath, isLibraryPath, isMorePath } from "@/lib/chrome";
import { cn } from "@/lib/utils";
import { useStudyPhone } from "@/components/app/study-phone-context";

export { StudyPhoneProvider } from "@/components/app/study-phone-context";

export function StudyPhoneTopBar() {
  const pathname = usePathname();
  const { email, currentStreak, longestStreak, setMoreOpen } = useStudyPhone();
  const initials = emailInitials(email);
  const subPage = isMorePath(pathname);

  return (
    <header className="sticky top-0 z-40 border-b border-base-300 bg-base-100/80 pt-safe backdrop-blur-sm md:hidden">
      <div className="navbar min-h-11 px-3 py-1">
        <div className="navbar-start">
          {subPage ? (
            <Link
              href="/jargon"
              className="btn btn-ghost btn-square min-h-11 min-w-11"
              aria-label="Back to library"
            >
              <ArrowLeft className="size-5" strokeWidth={1.5} aria-hidden />
            </Link>
          ) : (
            <Link href="/jargon" className="btn btn-ghost btn-square btn-sm" aria-label="Library">
              <BrandIcon />
            </Link>
          )}
        </div>
        <div className="navbar-center">
          <p className="m-0 font-heading text-sm font-semibold tracking-tight">
            {studyScreenTitle(pathname)}
          </p>
        </div>
        <div className="navbar-end gap-2">
          <StreakBadge currentStreak={currentStreak} longestStreak={longestStreak} />
          <InstallButton />
          <Button
            variant="ghost"
            size="sm"
            className="btn-circle size-8 shrink-0 overflow-hidden p-0 text-[11px] font-semibold text-primary bg-primary/15 hover:bg-primary/25"
            aria-label="More"
            onPress={() => setMoreOpen(true)}
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-transparent text-[11px] font-semibold leading-none text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </div>
      </div>
    </header>
  );
}

function dockItemClass(active: boolean) {
  return cn(
    "mb-0! min-h-11 items-center justify-center gap-0.5 after:content-none",
    active && "dock-active font-medium text-primary",
  );
}

function DockItemLabel({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "dock-label grid overflow-hidden text-center font-medium leading-none transition-[grid-template-rows,opacity] duration-300 ease-out",
        active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <span className="overflow-hidden">{children}</span>
    </span>
  );
}

export function StudyPhoneDock() {
  const pathname = usePathname();
  const { setMoreOpen, moreOpen } = useStudyPhone();
  const moreActive = isMorePath(pathname);

  return (
    <nav
      aria-label="Primary"
      className={cn("dock dock-md pb-safe md:hidden", !isDockPath(pathname) && "hidden")}
    >
      {STUDY_DOCK_TABS.map((tab) => {
        const active =
          tab.match === "library" ? isLibraryPath(pathname) : pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={dockItemClass(active)}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-5" strokeWidth={2} aria-hidden />
            <DockItemLabel active={active}>{tab.label}</DockItemLabel>
          </Link>
        );
      })}
      <button
        type="button"
        className={dockItemClass(moreActive)}
        aria-haspopup="dialog"
        aria-expanded={moreOpen}
        onClick={() => setMoreOpen(true)}
      >
        <Ellipsis className="size-5" strokeWidth={2} aria-hidden />
        <DockItemLabel active={moreActive}>More</DockItemLabel>
      </button>
    </nav>
  );
}

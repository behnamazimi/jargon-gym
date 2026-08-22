"use client";

import { ArrowLeft, Ellipsis, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { logout } from "@/app/(private)/auth/actions";
import {
  ACCOUNT_OVERFLOW_NAV,
  ADMIN_NAV_ITEMS,
  STUDY_DOCK_TABS,
  emailInitials,
  studyScreenTitle,
} from "@/components/app/account-nav";
import { BrandIcon } from "@/components/brand-icon";
import { InstallButton } from "@/components/pwa/install-prompt";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { isDockPath, isLibraryPath, isMorePath } from "@/lib/chrome";
import { cn } from "@/lib/utils";

type StudyPhoneContextValue = {
  email: string;
  isAdmin: boolean;
  initialIsDark: boolean;
  moreOpen: boolean;
  setMoreOpen: (open: boolean) => void;
};

const StudyPhoneContext = createContext<StudyPhoneContextValue | null>(null);

function useStudyPhone() {
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
  children,
}: {
  email: string;
  isAdmin: boolean;
  initialIsDark: boolean;
  children: ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const value = useMemo(
    () => ({ email, isAdmin, initialIsDark, moreOpen, setMoreOpen }),
    [email, isAdmin, initialIsDark, moreOpen],
  );

  return (
    <StudyPhoneContext.Provider value={value}>
      {children}
      <MoreSheet />
    </StudyPhoneContext.Provider>
  );
}

export function StudyPhoneTopBar() {
  const pathname = usePathname();
  const { email, setMoreOpen } = useStudyPhone();
  const initials = emailInitials(email);
  const subPage = isMorePath(pathname);

  return (
    <header className="sticky top-0 z-40 border-b border-base-300 bg-base-100/80 pt-safe backdrop-blur-sm md:hidden">
      <div className="navbar min-h-11 px-3 py-0">
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
        <div className="navbar-end gap-0">
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
            className={cn("min-h-11", active && "dock-active")}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-5" strokeWidth={1.5} aria-hidden />
            <span className="dock-label">{tab.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        className={cn("min-h-11", moreActive && "dock-active")}
        aria-haspopup="dialog"
        aria-expanded={moreOpen}
        onClick={() => setMoreOpen(true)}
      >
        <Ellipsis className="size-5" strokeWidth={1.5} aria-hidden />
        <span className="dock-label">More</span>
      </button>
    </nav>
  );
}

function MoreSheet() {
  const { email, isAdmin, initialIsDark, moreOpen, setMoreOpen } = useStudyPhone();
  const [isBusy, setIsBusy] = useState(false);
  const initials = emailInitials(email);

  async function handleLogout() {
    setIsBusy(true);
    await logout();
  }

  return (
    <Sheet
      isOpen={moreOpen}
      onOpenChange={setMoreOpen}
      side="bottom"
      className="max-h-[min(36rem,85dvh)] rounded-t-2xl pb-safe md:hidden"
    >
      <SheetHeader className="border-b border-base-300 px-4 py-3">
        <SheetTitle>More</SheetTitle>
        <div className="flex items-center gap-3 pt-1">
          <Avatar>
            <AvatarFallback className="text-xs font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <p className="m-0 min-w-0 truncate text-sm">{email}</p>
          <div className="ms-auto">
            <ThemeToggle initialIsDark={initialIsDark} />
          </div>
        </div>
      </SheetHeader>
      <ul className="menu w-full p-2">
        {ACCOUNT_OVERFLOW_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link href={item.href} onClick={() => setMoreOpen(false)} className="min-h-11">
                <Icon className="size-4" strokeWidth={1.5} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
        {isAdmin
          ? ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link href={item.href} onClick={() => setMoreOpen(false)} className="min-h-11">
                    <Icon className="size-4" strokeWidth={1.5} aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })
          : null}
        <li>
          <button
            type="button"
            className="min-h-11 text-error"
            disabled={isBusy}
            onClick={() => void handleLogout()}
          >
            <LogOut className="size-4" strokeWidth={1.5} aria-hidden />
            {isBusy ? "Signing out…" : "Log out"}
          </button>
        </li>
      </ul>
    </Sheet>
  );
}

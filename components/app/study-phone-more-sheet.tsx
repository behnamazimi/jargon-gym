"use client";

import { LogOut, XIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { logout } from "@/app/(private)/auth/actions";
import { ACCOUNT_OVERFLOW_NAV, ADMIN_NAV_ITEMS, emailInitials } from "@/components/app/account-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useStudyPhone } from "@/components/app/study-phone-context";

export function MoreSheet() {
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
      showCloseButton={false}
      className="max-h-[min(36rem,85dvh)] rounded-t-2xl pb-safe md:hidden"
    >
      <SheetHeader className="border-b border-base-300 px-4 py-3">
        <div className="flex items-center gap-1">
          <SheetTitle className="min-w-0 flex-1">More</SheetTitle>
          <ThemeToggle initialIsDark={initialIsDark} className="btn-sm shrink-0" />
          <SheetClose className="shrink-0">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <Avatar>
            <AvatarFallback className="text-xs font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <p className="m-0 min-w-0 truncate text-sm">{email}</p>
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

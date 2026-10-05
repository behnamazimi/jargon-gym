"use client";

import { resetAnalytics } from "@/lib/analytics/track";
import { Bug, Download, LogOut, XIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { logout } from "@/app/(private)/auth/actions";
import { ACCOUNT_OVERFLOW_NAV, ADMIN_NAV_ITEMS, emailInitials } from "@/components/app/account-nav";
import { ReportIssueDialog } from "@/components/issues/report-issue-dialog";
import { INSTALL_MENU_LABEL, useInstallAction } from "@/components/pwa/install-prompt";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useStudyPhone } from "@/components/app/study-phone-context";
import { ISSUE_COPY } from "@/lib/issues/copy";
import { LEGAL_LINKS } from "@/lib/site";
import { cn } from "@/lib/utils";

export function MoreSheet() {
  const { email, isAdmin, initialIsDark, moreOpen, setMoreOpen, aiCreditsLine } = useStudyPhone();
  const [isBusy, setIsBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const initials = emailInitials(email);
  const install = useInstallAction();

  async function handleLogout() {
    setIsBusy(true);
    resetAnalytics();
    await logout();
  }

  return (
    <>
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
              <AvatarFallback className="text-xs font-semibold text-primary-text">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="m-0 truncate text-sm">{email}</p>
              {aiCreditsLine ? (
                <Link
                  href="/app/settings?tab=ai"
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "-my-1.5 flex min-h-11 items-center text-xs no-underline",
                    aiCreditsLine.tone === "error" ? "text-error-text" : "text-base-content/70",
                  )}
                >
                  {aiCreditsLine.label}
                </Link>
              ) : null}
            </div>
          </div>
        </SheetHeader>
        <ul className="menu w-full p-2">
          {ACCOUNT_OVERFLOW_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="content-center min-h-11"
                >
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
                    <Link
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className="content-center min-h-11"
                    >
                      <Icon className="size-4" strokeWidth={1.5} aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })
            : null}
          {install ? (
            <li>
              <button
                type="button"
                className="content-center min-h-11"
                onClick={() => {
                  setMoreOpen(false);
                  install();
                }}
              >
                <Download className="size-4" strokeWidth={1.5} aria-hidden />
                {INSTALL_MENU_LABEL}
              </button>
            </li>
          ) : null}
          <li>
            <button
              type="button"
              className="content-center min-h-11"
              onClick={() => {
                setMoreOpen(false);
                setReportOpen(true);
              }}
            >
              <Bug className="size-4" strokeWidth={1.5} aria-hidden />
              {ISSUE_COPY.menuLabel}
            </button>
          </li>
          <li className="mt-2 border-t border-base-300 pt-2">
            <button
              type="button"
              className="content-center min-h-11 text-error-text"
              disabled={isBusy}
              onClick={() => void handleLogout()}
            >
              <LogOut className="size-4" strokeWidth={1.5} aria-hidden />
              {isBusy ? "Signing out…" : "Log out"}
            </button>
          </li>
        </ul>
        <nav
          aria-label="Legal"
          className="flex items-center justify-center gap-x-5 border-t border-base-300 px-4 py-1"
        >
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMoreOpen(false)}
              className="flex min-h-11 items-center text-xs text-base-content/70 underline underline-offset-2"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </Sheet>
      <ReportIssueDialog isOpen={reportOpen} onOpenChange={setReportOpen} />
    </>
  );
}

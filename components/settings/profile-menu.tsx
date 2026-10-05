"use client";

import { Bug, Download, LogOut, Sparkles } from "lucide-react";
import { useState } from "react";
import { logout } from "@/app/(private)/auth/actions";
import { ACCOUNT_HOME_NAV, ADMIN_NAV_ITEMS, emailInitials } from "@/components/app/account-nav";
import { AppRouterProvider } from "@/components/app-router-provider";
import { ReportIssueDialog } from "@/components/issues/report-issue-dialog";
import { INSTALL_MENU_LABEL, useInstallAction } from "@/components/pwa/install-prompt";
import { useAiCredits } from "@/hooks/use-ai-credits";
import { aiCreditsLine, type AiCreditsMenuMode } from "@/lib/ai-credits/menu-line";
import { ISSUE_COPY } from "@/lib/issues/copy";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ProfileMenuProps = {
  email: string;
  isAdmin?: boolean;
  aiCreditsMode: AiCreditsMenuMode;
};

export function ProfileMenu({ email, isAdmin = false, aiCreditsMode }: ProfileMenuProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const { load: aiCreditsLoad, refresh: refreshAiCredits } = useAiCredits(aiCreditsMode);
  const creditsLine = aiCreditsLine(aiCreditsMode, aiCreditsLoad);
  const initials = emailInitials(email);
  const install = useInstallAction();

  async function handleLogout() {
    setIsBusy(true);
    await logout();
  }

  return (
    <AppRouterProvider>
      <DropdownMenuTrigger onOpenChange={(open) => open && void refreshAiCredits()}>
        <Button
          variant="ghost"
          size="sm"
          className="btn-circle size-8 shrink-0 overflow-hidden p-0 text-xs font-semibold text-primary-text bg-primary/15 hover:bg-primary/25"
          aria-label="Account menu"
          data-tour="app-account"
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-transparent text-xs font-semibold leading-none text-primary-text">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
        <DropdownMenu className="min-w-[220px]">
          <DropdownMenuLabel className="flex items-start gap-3 px-3 py-3 font-normal">
            <Avatar>
              <AvatarFallback className="text-xs font-semibold text-primary-text">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="m-0 text-xs font-medium uppercase tracking-wider text-base-content/70">
                Signed in as
              </p>
              <p className="mt-0.5 truncate text-sm font-medium text-base-content">{email}</p>
            </div>
          </DropdownMenuLabel>
          {creditsLine ? (
            <DropdownMenuItem
              href={creditsLine.pending ? undefined : "/app/settings?tab=ai"}
              isDisabled={creditsLine.pending}
              textValue={creditsLine.label}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              <span className={cn(creditsLine.tone === "error" && "text-error-text")}>
                {creditsLine.label}
              </span>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          {ACCOUNT_HOME_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem key={item.href} href={item.href}>
                <Icon className="h-4 w-4" />
                {item.label}
              </DropdownMenuItem>
            );
          })}
          {isAdmin ? (
            <>
              <DropdownMenuSeparator />
              {ADMIN_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={item.href} href={item.href}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </DropdownMenuItem>
                );
              })}
            </>
          ) : null}
          {install ? (
            <DropdownMenuItem onAction={install}>
              <Download className="h-4 w-4" />
              {INSTALL_MENU_LABEL}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onAction={() => setReportOpen(true)}>
            <Bug className="h-4 w-4" />
            {ISSUE_COPY.menuLabel}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" isDisabled={isBusy} onAction={handleLogout}>
            <LogOut className="h-4 w-4" />
            {isBusy ? "Signing out…" : "Log out"}
          </DropdownMenuItem>
        </DropdownMenu>
      </DropdownMenuTrigger>
      <ReportIssueDialog isOpen={reportOpen} onOpenChange={setReportOpen} />
    </AppRouterProvider>
  );
}

"use client";

import { LogOut, Sparkles } from "lucide-react";
import { useState } from "react";
import { logout } from "@/app/(private)/auth/actions";
import { ACCOUNT_HOME_NAV, ADMIN_NAV_ITEMS, emailInitials } from "@/components/app/account-nav";
import { AppRouterProvider } from "@/components/app-router-provider";
import { useAiCredits } from "@/hooks/use-ai-credits";
import { aiCreditsLine, type AiCreditsMenuMode } from "@/lib/ai-credits/menu-line";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuGroup,
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
  const { load: aiCreditsLoad, refresh: refreshAiCredits } = useAiCredits(aiCreditsMode);
  const creditsLine = aiCreditsLine(aiCreditsMode, aiCreditsLoad);
  const initials = emailInitials(email);

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
          className="btn-circle size-8 shrink-0 overflow-hidden p-0 text-[11px] font-semibold text-primary bg-primary/15 hover:bg-primary/25"
          aria-label="Account menu"
          data-tour="app-account"
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-transparent text-[11px] font-semibold leading-none text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
        <DropdownMenu className="min-w-[220px]">
          <DropdownMenuLabel className="flex items-start gap-2.5 px-3 py-2.5 font-normal">
            <Avatar>
              <AvatarFallback className="text-xs font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="m-0 text-xs font-medium uppercase tracking-wide text-base-content/60">
                Signed in as
              </p>
              <p className="mt-0.5 truncate text-sm font-medium text-base-content">{email}</p>
            </div>
          </DropdownMenuLabel>
          {creditsLine ? (
            <DropdownMenuItem href="/jargon/settings?tab=ai" textValue={creditsLine.label}>
              <Sparkles className="h-4 w-4" />
              <span className={cn(creditsLine.tone === "error" && "text-error")}>
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
              <DropdownMenuGroup>
                <DropdownMenuLabel>Admin</DropdownMenuLabel>
                {ADMIN_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.href} href={item.href}>
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
            </>
          ) : null}
          <DropdownMenuItem variant="destructive" isDisabled={isBusy} onAction={handleLogout}>
            <LogOut className="h-4 w-4" />
            {isBusy ? "Signing out…" : "Log out"}
          </DropdownMenuItem>
        </DropdownMenu>
      </DropdownMenuTrigger>
    </AppRouterProvider>
  );
}

"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { logout } from "@/app/(private)/auth/actions";
import { ACCOUNT_HOME_NAV, ADMIN_NAV_ITEMS, emailInitials } from "@/components/app/account-nav";
import { AppRouterProvider } from "@/components/app-router-provider";
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
};

export function ProfileMenu({ email, isAdmin = false }: ProfileMenuProps) {
  const [isBusy, setIsBusy] = useState(false);
  const initials = emailInitials(email);

  async function handleLogout() {
    setIsBusy(true);
    await logout();
  }

  return (
    <AppRouterProvider>
      <DropdownMenuTrigger>
        <Button
          variant="ghost"
          className="btn-circle text-xs font-semibold text-primary bg-primary/15 hover:bg-primary/25"
          aria-label="Account menu"
        >
          <Avatar>
            <AvatarFallback className="bg-transparent text-xs font-semibold text-primary">
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

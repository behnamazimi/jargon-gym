"use client";

import { LogOut, Settings } from "lucide-react";
import { useState } from "react";
import { logout } from "@/app/(private)/auth/actions";
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
};

function getInitials(email: string) {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return local.slice(0, 2).toUpperCase();
}

export function ProfileMenu({ email }: ProfileMenuProps) {
  const [isBusy, setIsBusy] = useState(false);
  const initials = getInitials(email);

  async function handleLogout() {
    setIsBusy(true);
    await logout();
  }

  return (
    <DropdownMenuTrigger>
      <Button
        variant="ghost"
        size="icon-lg"
        className="rounded-full text-[12px] font-semibold text-primary bg-primary/15 hover:bg-primary/25"
        aria-label="Account menu"
      >
        <Avatar size="sm" className="size-8 after:hidden">
          <AvatarFallback className="bg-transparent text-[12px] font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
      </Button>
      <DropdownMenu className="min-w-[220px]">
        <DropdownMenuLabel className="flex items-start gap-2.5 px-3 py-2.5 font-normal">
          <Avatar size="sm" className="size-8 after:hidden">
            <AvatarFallback className="text-[12px] font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="m-0 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
              Signed in as
            </p>
            <p className="mt-0.5 truncate text-[13px] font-medium text-foreground">{email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem href="/jargon/settings">
          <Settings className="h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" isDisabled={isBusy} onAction={handleLogout}>
          <LogOut className="h-4 w-4" />
          {isBusy ? "Signing out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenu>
    </DropdownMenuTrigger>
  );
}

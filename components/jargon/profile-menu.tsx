"use client";

import {
  Bug,
  Compass,
  LayoutList,
  LogOut,
  Mail,
  Settings,
  Signal,
  SquareLibrary,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { logout } from "@/app/(private)/auth/actions";
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

function getInitials(email: string) {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return local.slice(0, 2).toUpperCase();
}

export function ProfileMenu({ email, isAdmin = false }: ProfileMenuProps) {
  const [isBusy, setIsBusy] = useState(false);
  const initials = getInitials(email);

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
          <DropdownMenuItem href="/jargon">
            <LayoutList className="h-4 w-4" />
            Collections
          </DropdownMenuItem>
          <DropdownMenuItem href="/jargon/browse">
            <Compass className="h-4 w-4" />
            Browse
          </DropdownMenuItem>
          <DropdownMenuItem href="/jargon/import">
            <Upload className="h-4 w-4" />
            Import
          </DropdownMenuItem>
          <DropdownMenuItem href="/jargon/mastery">
            <Signal className="h-4 w-4" />
            Mastery
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem href="/jargon/settings">
            <Settings className="h-4 w-4" />
            Settings
          </DropdownMenuItem>
          {isAdmin ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Admin</DropdownMenuLabel>
                <DropdownMenuItem href="/jargon/debug">
                  <Bug className="h-4 w-4" />
                  Queue debug
                </DropdownMenuItem>
                <DropdownMenuItem href="/admin/collections">
                  <SquareLibrary className="h-4 w-4" />
                  Manage collections
                </DropdownMenuItem>
                <DropdownMenuItem href="/admin/invites">
                  <Mail className="h-4 w-4" />
                  Invites
                </DropdownMenuItem>
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

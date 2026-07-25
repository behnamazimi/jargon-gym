"use client";

import { Compass, Moon, Sun, Upload } from "lucide-react";
import Link from "next/link";
import type { Domain } from "@/lib/jargon/types";
import { CollectionTabs } from "./collection-tabs";
import { DomainActionsMenu, DomainMeta } from "./domain-actions-menu";
import { ProfileMenu } from "./profile-menu";

type HeaderProps = {
  domain: Domain;
  domains: Domain[];
  categoryCount: number;
  userEmail: string;
  isDark: boolean;
  onToggleTheme: () => void;
};

export function Header({
  domain,
  domains,
  categoryCount,
  userEmail,
  isDark,
  onToggleTheme,
}: HeaderProps) {
  return (
    <header className="mb-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="m-0 text-[20px] font-bold tracking-tight">
          <span className="text-accent">Jargon</span>
        </h1>
        <div className="flex items-center gap-1">
          <Link
            href="/jargon/import"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-muted transition-colors hover:bg-black/5 hover:text-foreground"
            title="Import jargon"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Import</span>
          </Link>
          <Link
            href="/jargon/browse"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-muted transition-colors hover:bg-black/5 hover:text-foreground"
            title="Browse shared domains"
          >
            <Compass className="h-4 w-4" />
            <span className="hidden sm:inline">Browse</span>
          </Link>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-black/5 hover:text-foreground"
            onClick={onToggleTheme}
            title="Toggle light/dark theme"
          >
            {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <ProfileMenu email={userEmail} />
        </div>
      </div>

      <div className="mt-4">
        <CollectionTabs domains={domains} currentDomainId={domain.id} />
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <DomainMeta domain={domain} categoryCount={categoryCount} />
        <DomainActionsMenu domain={domain} domains={domains} />
      </div>
    </header>
  );
}

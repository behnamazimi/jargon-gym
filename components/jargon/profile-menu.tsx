"use client";

import { LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/(private)/auth/actions";

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
  const [open, setOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initials = getInitials(email);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    setIsBusy(true);
    await logout();
  }

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/25"
      >
        {initials}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 min-w-[220px] overflow-hidden rounded-lg border border-border bg-background py-1 shadow-lg"
        >
          <div className="flex items-start gap-2.5 border-b border-border px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-medium uppercase tracking-wide text-muted">
                Signed in as
              </p>
              <p className="mt-0.5 truncate text-[13px] font-medium text-foreground">{email}</p>
            </div>
          </div>

          <button
            type="button"
            role="menuitem"
            disabled={isBusy}
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            {isBusy ? "Signing out…" : "Log out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

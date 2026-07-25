"use client";

import {
  BookOpen,
  CheckCircle2,
  FolderOpen,
  Globe,
  Link2,
  Lock,
  MoreHorizontal,
  Pause,
  Play,
  Share2,
  Trash2,
  User,
  BookmarkMinus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteOwnedDomain,
  removeFromCollection,
  shareDomain,
  toggleActiveForReview,
  unshareDomain,
} from "@/app/(private)/jargon/actions";
import type { Domain } from "@/lib/jargon/types";
import { MenuItem, MetaItem } from "./icon-ui";

type DomainActionsMenuProps = {
  domain: Domain;
  domains: Domain[];
};

export function DomainActionsMenu({ domain, domains }: DomainActionsMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  async function runAction(action: () => Promise<{ error?: string }>, onSuccess?: () => void) {
    setIsBusy(true);
    setError(null);

    const result = await action();

    setIsBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    onSuccess?.();
    router.refresh();
  }

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-black/5 hover:text-foreground"
        title="Collection actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[210px] overflow-hidden rounded-lg border border-border bg-background py-1 shadow-lg"
        >
          <MenuItem
            icon={domain.isActiveForReview ? Pause : Play}
            label={domain.isActiveForReview ? "Pause review" : "Resume review"}
            disabled={isBusy}
            onClick={() =>
              runAction(() => toggleActiveForReview(domain.id, !domain.isActiveForReview))
            }
          />

          {domain.source === "owned" ? (
            <>
              {domain.visibility === "private" ? (
                <MenuItem
                  icon={Share2}
                  label="Share domain"
                  disabled={isBusy}
                  onClick={() => runAction(() => shareDomain(domain.id))}
                />
              ) : (
                <MenuItem
                  icon={Lock}
                  label="Unshare domain"
                  disabled={isBusy}
                  onClick={() => runAction(() => unshareDomain(domain.id))}
                />
              )}
              <div className="my-1 border-t border-border" />
              <MenuItem
                icon={Trash2}
                label="Delete domain"
                disabled={isBusy}
                destructive
                onClick={() => {
                  if (!confirm(`Delete "${domain.name}" and all its terms?`)) return;
                  runAction(
                    () => deleteOwnedDomain(domain.id),
                    () => router.push("/jargon"),
                  );
                }}
              />
            </>
          ) : (
            <MenuItem
              icon={BookmarkMinus}
              label="Remove from collection"
              disabled={isBusy}
              onClick={() =>
                runAction(
                  () => removeFromCollection(domain.id),
                  () => {
                    const fallback = domains.find((item) => item.id !== domain.id);
                    router.push(fallback ? `/jargon?domain=${fallback.id}` : "/jargon");
                  },
                )
              }
            />
          )}
        </div>
      ) : null}

      {error ? (
        <p className="absolute right-0 top-full mt-10 w-48 text-[11px] text-red-600">{error}</p>
      ) : null}
    </div>
  );
}

export function DomainMeta({ domain, categoryCount }: { domain: Domain; categoryCount: number }) {
  return (
    <div className="min-w-0 flex-1">
      {domain.description ? (
        <p className="truncate text-[13px] text-foreground/80">{domain.description}</p>
      ) : null}
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
        {domain.source === "owned" ? (
          domain.visibility === "shared" ? (
            <MetaItem icon={Globe} label="Shared" />
          ) : (
            <MetaItem icon={Lock} label="Private" />
          )
        ) : (
          <MetaItem icon={Link2} label="Added" />
        )}

        <MetaItem
          icon={domain.isActiveForReview ? Play : Pause}
          label={domain.isActiveForReview ? "Active" : "Paused"}
        />
        <MetaItem icon={FolderOpen} label={`${domain.termCount} terms`} />
        <MetaItem icon={BookOpen} label={`${categoryCount} categories`} />
        <MetaItem icon={CheckCircle2} label={`${domain.knownCount}/${domain.termCount} known`} />
      </div>
    </div>
  );
}

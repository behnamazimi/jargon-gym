"use client";

import {
  BookmarkMinus,
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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCollectionActions } from "@/hooks/use-collection-actions";
import type { Domain } from "@/lib/jargon/types";
import { MetaItem } from "./icon-ui";

type DomainActionsMenuProps = {
  domain: Domain;
  domains: Domain[];
};

export function DomainActionsMenu({ domain, domains }: DomainActionsMenuProps) {
  const router = useRouter();
  const {
    error,
    isBusy,
    busyId,
    toggleActiveForReview,
    shareDomain,
    unshareDomain,
    deleteOwnedDomain,
    removeFromCollection,
  } = useCollectionActions();

  const disabled = isBusy && busyId === domain.id;

  return (
    <div className="relative shrink-0">
      <DropdownMenuTrigger>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted hover:text-foreground"
          aria-label="Collection actions"
          isDisabled={disabled}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
        <DropdownMenu className="min-w-[210px]">
          <DropdownMenuItem
            isDisabled={disabled}
            onAction={() => toggleActiveForReview(domain.id, !domain.isActiveForReview)}
          >
            {domain.isActiveForReview ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {domain.isActiveForReview ? "Pause review" : "Resume review"}
          </DropdownMenuItem>

          {domain.source === "owned" ? (
            <>
              {domain.visibility === "private" ? (
                <DropdownMenuItem isDisabled={disabled} onAction={() => shareDomain(domain.id)}>
                  <Share2 className="h-4 w-4" />
                  Share domain
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem isDisabled={disabled} onAction={() => unshareDomain(domain.id)}>
                  <Lock className="h-4 w-4" />
                  Unshare domain
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                isDisabled={disabled}
                onAction={() => {
                  if (!confirm(`Delete "${domain.name}" and all its terms?`)) return;
                  deleteOwnedDomain(domain.id, () => router.push("/jargon"));
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete domain
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem
              isDisabled={disabled}
              onAction={() => {
                const fallback = domains.find((item) => item.id !== domain.id);
                removeFromCollection(domain.id, () => {
                  router.push(fallback ? `/jargon?domain=${fallback.id}` : "/jargon");
                });
              }}
            >
              <BookmarkMinus className="h-4 w-4" />
              Remove from collection
            </DropdownMenuItem>
          )}
        </DropdownMenu>
      </DropdownMenuTrigger>

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
